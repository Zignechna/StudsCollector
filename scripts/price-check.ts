/**
 * Price checker — runs in GitHub Actions (never on Vercel).
 *  - refreshes TCMB exchange rates (EUR/USD → TRY)
 *  - visits every product link with its site adapter, politely (delay between requests)
 *  - writes price_history ONLY when price or stock changes (saves Turso writes)
 *  - evaluates per-product alert rules and sends Web Push notifications (no duplicates)
 * A broken/blocked link is marked "error" and shown in the app; the script never crashes on it.
 *
 * Usage: npm run prices:check
 */
import "./env";
import type { InStatement } from "@libsql/client";
import { client } from "../src/db";
import { adapterFor } from "../src/lib/price/adapters";
import { siteLabel } from "../src/lib/price/sites";
import { sendPushToAll, type PushPayload } from "../src/lib/push";

const DELAY_SAME_SITE_MS = 6000;
const DELAY_ANY_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (v: number, c = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency: c }).format(v);

async function updateRates(): Promise<Record<string, number>> {
  const rates: Record<string, number> = { TRY: 1 };
  try {
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", { signal: AbortSignal.timeout(15000) });
    const xml = await res.text();
    const date = xml.match(/Date="([\d/.]+)"/)?.[1] ?? new Date().toISOString().slice(0, 10);
    const isoDate = /^\d{2}\.\d{2}\.\d{4}$/.test(date) ? date.split(".").reverse().join("-") : /^\d{2}\/\d{2}\/\d{4}$/.test(date) ? `${date.slice(6)}-${date.slice(0, 2)}-${date.slice(3, 5)}` : date;
    for (const code of ["EUR", "USD"]) {
      const block = xml.match(new RegExp(`CurrencyCode="${code}"[\\s\\S]*?</Currency>`))?.[0];
      const selling = block?.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/)?.[1];
      if (!selling) continue;
      rates[code] = Number(selling);
      const existing = await client.execute({ sql: "SELECT date FROM exchange_rates WHERE currency = ?", args: [code] });
      if (existing.rows[0]?.date !== isoDate) {
        await client.execute({
          sql: `INSERT INTO exchange_rates (currency, rate_try, date) VALUES (?, ?, ?)
                ON CONFLICT(currency) DO UPDATE SET rate_try = excluded.rate_try, date = excluded.date`,
          args: [code, rates[code], isoDate],
        });
      }
    }
    console.log("Rates:", rates);
  } catch (err) {
    console.warn("TCMB rates unavailable, using stored ones:", (err as Error).message);
  }
  const stored = await client.execute("SELECT currency, rate_try FROM exchange_rates");
  for (const r of stored.rows) rates[String(r.currency)] ??= Number(r.rate_try);
  return rates;
}

type ListingRow = {
  id: number;
  productId: number;
  site: string;
  url: string;
  currency: string;
  lastPrice: number | null;
  lastInStock: boolean | null;
};

async function checkListings() {
  const res = await client.execute("SELECT id, product_id, site, url, currency, last_price, last_in_stock FROM product_listings ORDER BY site, id");
  const listings: ListingRow[] = res.rows.map((r) => ({
    id: Number(r.id),
    productId: Number(r.product_id),
    site: String(r.site),
    url: String(r.url),
    currency: String(r.currency),
    lastPrice: r.last_price == null ? null : Number(r.last_price),
    lastInStock: r.last_in_stock == null ? null : Boolean(Number(r.last_in_stock)),
  }));
  console.log(`Checking ${listings.length} listing(s)…`);
  const lastHit = new Map<string, number>();
  const drops = new Map<number, { listing: ListingRow; from: number; to: number }[]>();
  let ok = 0;
  let failed = 0;

  for (const l of listings) {
    const wait = Math.max(DELAY_ANY_MS, (lastHit.get(l.site) ?? 0) + DELAY_SAME_SITE_MS - Date.now());
    await sleep(wait);
    lastHit.set(l.site, Date.now());
    try {
      const r = await adapterFor(l.site).fetch(l.url);
      const price = r.price ?? l.lastPrice; // out-of-stock pages may hide the price
      const changed = price != null && (price !== l.lastPrice || r.inStock !== l.lastInStock);
      const statements: InStatement[] = [
        {
          sql: `UPDATE product_listings SET status = 'active', last_error = NULL, last_checked_at = unixepoch(),
                last_price = ?, last_in_stock = ?, currency = ? WHERE id = ?`,
          args: [price, r.inStock ? 1 : 0, r.currency || l.currency, l.id],
        },
      ];
      if (changed) {
        statements.push({
          sql: "INSERT INTO price_history (listing_id, price, in_stock, recorded_at) VALUES (?, ?, ?, unixepoch())",
          args: [l.id, price, r.inStock ? 1 : 0],
        });
      }
      await client.batch(statements, "write");
      if (changed && l.lastPrice != null && price != null && price < l.lastPrice && r.inStock) {
        drops.set(l.productId, [...(drops.get(l.productId) ?? []), { listing: l, from: l.lastPrice, to: price }]);
      }
      console.log(`  ✓ ${siteLabel(l.site)} #${l.id}: ${price ?? "—"} ${r.currency}${r.inStock ? "" : " (stok yok)"}${changed ? " *" : ""}`);
      ok++;
    } catch (err) {
      const message = (err as Error).message.slice(0, 300);
      await client.execute({
        sql: "UPDATE product_listings SET status = 'error', last_error = ?, last_checked_at = unixepoch() WHERE id = ?",
        args: [message, l.id],
      });
      console.log(`  ✗ ${siteLabel(l.site)} #${l.id}: ${message}`);
      failed++;
    }
  }
  console.log(`Listings: ${ok} ok, ${failed} failed.`);
  return drops;
}

async function evaluateAlerts(rates: Record<string, number>, drops: Map<number, { listing: ListingRow; from: number; to: number }[]>) {
  const products = await client.execute("SELECT id, name, set_num FROM tracked_products");
  const notifications: PushPayload[] = [];

  for (const p of products.rows) {
    const productId = Number(p.id);
    const alerts = await client.execute({ sql: "SELECT * FROM price_alerts WHERE product_id = ?", args: [productId] });
    if (!alerts.rows.length) continue;
    const listings = await client.execute({
      sql: "SELECT id, site, currency, last_price, last_in_stock, status FROM product_listings WHERE product_id = ?",
      args: [productId],
    });
    const toTry = (price: number, currency: string) => (rates[currency] ? price * rates[currency] : null);
    let best: { price: number; site: string } | null = null;
    for (const l of listings.rows) {
      if (l.status !== "active" || l.last_price == null || !Number(l.last_in_stock)) continue;
      const v = toTry(Number(l.last_price), String(l.currency));
      if (v != null && (!best || v < best.price)) best = { price: Math.round(v * 100) / 100, site: String(l.site) };
    }
    if (!best) continue;

    // History in TRY (current rates) excluding the newest rows of this run, for records / baselines.
    const history = await client.execute({
      sql: `SELECT h.price, h.recorded_at, l.currency FROM price_history h JOIN product_listings l ON l.id = h.listing_id
            WHERE l.product_id = ? AND h.in_stock = 1 ORDER BY h.recorded_at`,
      args: [productId],
    });
    const histTry = history.rows.map((h) => ({ v: toTry(Number(h.price), String(h.currency)) ?? Infinity, at: Number(h.recorded_at) }));
    const runStart = Math.floor(Date.now() / 1000) - 60 * 60;
    const before = histTry.filter((h) => h.at < runStart).map((h) => h.v);
    const firstPrice = histTry[0]?.v ?? null;
    const name = String(p.name);
    const url = `/fiyat/${productId}`;

    for (const a of alerts.rows) {
      const alertId = Number(a.id);
      const type = String(a.type);
      const value = a.value == null ? null : Number(a.value);
      const last = a.last_notified_price == null ? null : Number(a.last_notified_price);
      let message: string | null = null;

      if (type === "any_drop") {
        const d = drops.get(productId);
        if (d?.length && last !== best.price) {
          const x = d[0];
          message = `${siteLabel(x.listing.site)}: ${fmt(x.from, x.listing.currency)} → ${fmt(x.to, x.listing.currency)}`;
        }
      } else if (type === "below" && value != null) {
        if (best.price <= value && (last == null || last > value)) message = `${fmt(best.price)} ile hedefin (${fmt(value)}) altında — ${siteLabel(best.site)}`;
        if (best.price > value && last != null) {
          await client.execute({ sql: "UPDATE price_alerts SET last_notified_price = NULL WHERE id = ?", args: [alertId] }); // re-arm
        }
      } else if (type === "percent" && value != null) {
        const base = last ?? firstPrice;
        if (base != null && Number.isFinite(base) && best.price <= base * (1 - value / 100)) {
          message = `%${Math.round((1 - best.price / base) * 100)} düştü: ${fmt(best.price)} — ${siteLabel(best.site)}`;
        }
      } else if (type === "all_time_low") {
        const prevLow = before.length ? Math.min(...before) : null;
        if (prevLow != null && best.price < prevLow - 0.01 && last !== best.price) {
          message = `En düşük fiyat rekoru: ${fmt(best.price)} (önceki ${fmt(prevLow)}) — ${siteLabel(best.site)}`;
        }
      }

      if (message) {
        notifications.push({ title: `💸 ${name}`, body: message, url, tag: `price-${productId}` });
        await client.execute({ sql: "UPDATE price_alerts SET last_notified_price = ? WHERE id = ?", args: [best.price, alertId] });
      }
    }
  }

  for (const n of notifications) {
    const r = await sendPushToAll(n);
    console.log(`Push "${n.body}" → ${r.sent} sent, ${r.failed} failed`);
  }
  if (!notifications.length) console.log("No price notifications.");
}

async function main() {
  const rates = await updateRates();
  const drops = await checkListings();
  await evaluateAlerts(rates, drops);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
