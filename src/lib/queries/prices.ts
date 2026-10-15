import "server-only";
import { client } from "@/db";

export type Listing = {
  id: number;
  productId: number;
  site: string;
  url: string;
  currency: string;
  status: string;
  lastCheckedAt: number | null;
  lastPrice: number | null;
  lastInStock: boolean | null;
  lastError: string | null;
  previousPrice: number | null;
  lowestPrice: number | null;
};

export type ProductSummary = {
  id: number;
  name: string;
  imgUrl: string | null;
  setNum: string | null;
  notes: string | null;
  listings: Listing[];
  /** lowest current price converted to TRY */
  bestTry: number | null;
  dropped: boolean;
};

export async function getRates(): Promise<Record<string, number>> {
  const res = await client.execute("SELECT currency, rate_try FROM exchange_rates");
  const rates: Record<string, number> = { TRY: 1 };
  for (const r of res.rows) rates[String(r.currency)] = Number(r.rate_try);
  return rates;
}

export async function getRatesInfo() {
  const res = await client.execute("SELECT currency, rate_try, date FROM exchange_rates ORDER BY currency");
  return res.rows.map((r) => ({ currency: String(r.currency), rate: Number(r.rate_try), date: String(r.date) }));
}

export function toTry(price: number | null, currency: string, rates: Record<string, number>) {
  if (price == null) return null;
  const rate = rates[currency];
  return rate ? price * rate : null;
}

const LISTING_SQL = `
  SELECT l.*,
    (SELECT h.price FROM price_history h WHERE h.listing_id = l.id ORDER BY h.recorded_at DESC, h.id DESC LIMIT 1 OFFSET 1) AS previous_price,
    (SELECT MIN(h.price) FROM price_history h WHERE h.listing_id = l.id AND h.in_stock = 1) AS lowest_price
  FROM product_listings l`;

function mapListing(r: Record<string, unknown>): Listing {
  return {
    id: Number(r.id),
    productId: Number(r.product_id),
    site: String(r.site),
    url: String(r.url),
    currency: String(r.currency),
    status: String(r.status),
    lastCheckedAt: r.last_checked_at == null ? null : Number(r.last_checked_at),
    lastPrice: r.last_price == null ? null : Number(r.last_price),
    lastInStock: r.last_in_stock == null ? null : Boolean(Number(r.last_in_stock)),
    lastError: (r.last_error as string) ?? null,
    previousPrice: r.previous_price == null ? null : Number(r.previous_price),
    lowestPrice: r.lowest_price == null ? null : Number(r.lowest_price),
  };
}

async function summarize(productRows: Record<string, unknown>[]): Promise<ProductSummary[]> {
  if (!productRows.length) return [];
  const ids = productRows.map((p) => Number(p.id));
  const [listingsRes, rates] = await Promise.all([
    client.execute({ sql: `${LISTING_SQL} WHERE l.product_id IN (${ids.map(() => "?").join(",")}) ORDER BY l.id`, args: ids }),
    getRates(),
  ]);
  const listings = listingsRes.rows.map((r) => mapListing(r as Record<string, unknown>));
  return productRows.map((p) => {
    const own = listings.filter((l) => l.productId === Number(p.id));
    const prices = own
      .filter((l) => l.status === "active" && l.lastPrice != null && l.lastInStock !== false)
      .map((l) => toTry(l.lastPrice, l.currency, rates))
      .filter((v): v is number => v != null);
    return {
      id: Number(p.id),
      name: String(p.name),
      imgUrl: (p.img_url as string) ?? null,
      setNum: (p.set_num as string) ?? null,
      notes: (p.notes as string) ?? null,
      listings: own,
      bestTry: prices.length ? Math.min(...prices) : null,
      dropped: own.some((l) => l.lastPrice != null && l.previousPrice != null && l.lastPrice < l.previousPrice),
    };
  });
}

export async function listProducts(): Promise<ProductSummary[]> {
  const res = await client.execute("SELECT * FROM tracked_products ORDER BY created_at DESC");
  return summarize(res.rows as unknown as Record<string, unknown>[]);
}

export async function getProductsForSet(setNum: string): Promise<ProductSummary[]> {
  const res = await client.execute({ sql: "SELECT * FROM tracked_products WHERE set_num = ? ORDER BY id", args: [setNum] });
  return summarize(res.rows as unknown as Record<string, unknown>[]);
}

/** set_num → { bestTry, dropped } for wishlist cards. */
export async function getPriceBadges(setNums: string[]) {
  if (!setNums.length) return new Map<string, { bestTry: number | null; dropped: boolean }>();
  const res = await client.execute({
    sql: `SELECT * FROM tracked_products WHERE set_num IN (${setNums.map(() => "?").join(",")})`,
    args: setNums,
  });
  const products = await summarize(res.rows as unknown as Record<string, unknown>[]);
  const map = new Map<string, { bestTry: number | null; dropped: boolean }>();
  for (const p of products) {
    if (!p.setNum) continue;
    const cur = map.get(p.setNum);
    map.set(p.setNum, {
      bestTry: cur?.bestTry != null && p.bestTry != null ? Math.min(cur.bestTry, p.bestTry) : (cur?.bestTry ?? p.bestTry),
      dropped: Boolean(cur?.dropped || p.dropped),
    });
  }
  return map;
}

export async function getProduct(id: number) {
  const res = await client.execute({ sql: "SELECT * FROM tracked_products WHERE id = ?", args: [id] });
  if (!res.rows[0]) return null;
  const [product] = await summarize([res.rows[0] as unknown as Record<string, unknown>]);
  const [history, alerts] = await Promise.all([
    client.execute({
      sql: `SELECT h.listing_id, h.price, h.in_stock, h.recorded_at FROM price_history h
            JOIN product_listings l ON l.id = h.listing_id WHERE l.product_id = ? ORDER BY h.recorded_at`,
      args: [id],
    }),
    client.execute({ sql: "SELECT * FROM price_alerts WHERE product_id = ? ORDER BY id", args: [id] }),
  ]);
  return {
    ...product,
    history: history.rows.map((r) => ({
      listingId: Number(r.listing_id),
      price: Number(r.price),
      inStock: Boolean(Number(r.in_stock)),
      at: Number(r.recorded_at),
    })),
    alerts: alerts.rows.map((r) => ({
      id: Number(r.id),
      type: String(r.type),
      value: r.value == null ? null : Number(r.value),
      lastNotifiedPrice: r.last_notified_price == null ? null : Number(r.last_notified_price),
    })),
  };
}
