import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, Tag } from "lucide-react";
import { getProduct, getRates, toTry } from "@/lib/queries/prices";
import { fmtDate, fmtMoney, nowSeconds } from "@/lib/format";
import { siteLabel } from "@/lib/price/sites";
import { PriceChart } from "./price-chart";
import { AddListingForm, AlertsEditor, DeleteListingButton, ProductEditor } from "./product-client";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(Number(id));
  return { title: p?.name ?? "Ürün" };
}

const SERIES_COLORS = ["#f5b800", "#5aa9ff", "#34d399", "#f472b6", "#fb923c", "#a78bfa", "#22d3ee", "#f05252"];

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const [product, rates] = await Promise.all([getProduct(Number(id)), getRates()]);
  if (!product) notFound();

  const rows = product.listings
    .map((l) => ({ ...l, tryPrice: toTry(l.lastPrice, l.currency, rates) }))
    .sort((a, b) => (a.tryPrice ?? Infinity) - (b.tryPrice ?? Infinity));
  const best = rows.find((r) => r.status === "active" && r.tryPrice != null && r.lastInStock !== false);
  const allTimeLow = product.history.length
    ? Math.min(...product.history.filter((h) => h.inStock).map((h) => toTry(h.price, product.listings.find((l) => l.id === h.listingId)?.currency ?? "TRY", rates) ?? Infinity))
    : null;

  const series = product.listings.map((l, i) => ({
    id: l.id,
    label: siteLabel(l.site),
    currency: l.currency,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    rate: rates[l.currency] ?? null,
    points: product.history.filter((h) => h.listingId === l.id).map((h) => ({ at: h.at, price: h.price, inStock: h.inStock })),
  }));

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1 text-xs text-muted" aria-label="Konum">
        <Link href="/fiyat" className="hover:text-fg">
          Fiyat takibi
        </Link>
        <ChevronRight className="size-3" />
      </nav>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-tile">
          {product.imgUrl ? <img src={product.imgUrl} alt="" className="h-full w-full object-contain p-2" /> : <Tag className="size-10 text-neutral-300" />}
        </div>
        <div className="min-w-0">
          <h1 className="page-title text-balance">{product.name}</h1>
          {product.setNum && (
            <Link href={`/set/${encodeURIComponent(product.setNum)}`} className="text-sm text-accent hover:underline">
              Set {product.setNum} →
            </Link>
          )}
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-muted">En iyi: </span>
              <span className="font-display text-2xl font-bold">{best ? fmtMoney(best.tryPrice) : "—"}</span>
              {best && <span className="text-muted"> · {siteLabel(best.site)}</span>}
            </span>
            {allTimeLow != null && Number.isFinite(allTimeLow) && (
              <span>
                <span className="text-muted">En düşük (tüm zamanlar): </span>
                <span className="font-semibold text-good">{fmtMoney(allTimeLow)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="section-title mb-3">Mağazalar</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="p-3">Mağaza</th>
                <th className="p-3 text-right">Fiyat</th>
                <th className="p-3 text-right">TL karşılığı</th>
                <th className="p-3 text-right">En düşük</th>
                <th className="p-3">Durum</th>
                <th className="p-3">Son kontrol</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((l) => {
                const dropped = l.lastPrice != null && l.previousPrice != null && l.lastPrice < l.previousPrice;
                return (
                  <tr key={l.id} className={best?.id === l.id ? "bg-good-soft/50" : ""}>
                    <td className="p-3">
                      <a href={l.url} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold hover:text-accent">
                        {siteLabel(l.site)} <ExternalLink className="size-3" />
                      </a>
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {fmtMoney(l.lastPrice, l.currency)}
                      {dropped && <span className="badge ml-1.5 bg-good text-white">↓</span>}
                    </td>
                    <td className="p-3 text-right tabular-nums text-fg-2">{l.currency === "TRY" ? "—" : fmtMoney(l.tryPrice)}</td>
                    <td className="p-3 text-right tabular-nums text-fg-2">{fmtMoney(l.lowestPrice, l.currency)}</td>
                    <td className="p-3 text-xs">
                      {l.status === "error" ? (
                        <span className="text-bad" title={l.lastError ?? ""}>
                          Kontrol edilemiyor
                        </span>
                      ) : l.lastCheckedAt == null ? (
                        <span className="text-muted">İlk kontrol bekleniyor</span>
                      ) : l.lastInStock === false ? (
                        <span className="text-warn">Stokta yok</span>
                      ) : (
                        <span className="text-good">Stokta</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted">{l.lastCheckedAt ? fmtDate(l.lastCheckedAt) : "—"}</td>
                    <td className="p-3 text-right">
                      <DeleteListingButton id={l.id} />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted">
                    Henüz link yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AddListingForm productId={product.id} />
      </section>

      <section className="mb-8">
        <h2 className="section-title mb-3">Fiyat geçmişi</h2>
        <PriceChart series={series} now={nowSeconds()} />
      </section>

      <section className="mb-8">
        <h2 className="section-title mb-3">Bildirim kuralları</h2>
        <AlertsEditor productId={product.id} alerts={product.alerts} />
      </section>

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-fg-2 hover:text-fg">Ürünü düzenle</summary>
        <div className="mt-3 max-w-xl">
          <ProductEditor product={{ id: product.id, name: product.name, imgUrl: product.imgUrl, setNum: product.setNum, notes: product.notes }} />
        </div>
      </details>
    </div>
  );
}
