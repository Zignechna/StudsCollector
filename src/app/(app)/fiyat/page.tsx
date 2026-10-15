import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Plus, Tag, TrendingDown } from "lucide-react";
import { getRatesInfo, listProducts } from "@/lib/queries/prices";
import { fmtDate, fmtMoney } from "@/lib/format";
import { siteLabel } from "@/lib/price/sites";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Fiyat Takibi" };

export default async function PricesPage() {
  const [products, rates] = await Promise.all([listProducts(), getRatesInfo()]);
  const eur = rates.find((r) => r.currency === "EUR");
  return (
    <div>
      <PageHeader
        title="Fiyat takibi"
        description="Aynı ürünü birden fazla mağazadan takip et; fiyat düştüğünde telefonuna bildirim gelsin. Fiyatlar GitHub Actions ile günde birkaç kez kontrol edilir."
        actions={
          <Link href="/fiyat/yeni" className="btn-primary">
            <Plus className="size-4" /> Ürün ekle
          </Link>
        }
      />
      {eur && (
        <p className="mb-4 text-xs text-muted">
          Kur (TCMB): 1 EUR = {eur.rate.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} TL · {fmtDate(eur.date)}
        </p>
      )}
      {products.length === 0 ? (
        <EmptyState
          icon={<Tag />}
          title="Takip edilen ürün yok"
          action={
            <Link href="/fiyat/yeni" className="btn-primary">
              <Plus className="size-4" /> İlk ürünü ekle
            </Link>
          }
        >
          LEGO setleri veya herhangi bir ürün için Amazon, LEGO, Hepsiburada, Trendyol, n11, Müller linklerini ekleyebilirsin.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const errors = p.listings.filter((l) => l.status === "error").length;
            return (
              <Link key={p.id} href={`/fiyat/${p.id}`} className="card flex gap-3 p-3 transition hover:border-line-strong">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-tile">
                  {p.imgUrl ? <img src={p.imgUrl} alt="" loading="lazy" className="h-full w-full object-contain p-1" /> : <Tag className="size-7 text-neutral-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="line-clamp-2 font-semibold">{p.name}</div>
                    {p.dropped && (
                      <span className="badge shrink-0 bg-good text-white">
                        <TrendingDown className="size-3" /> Düştü
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold">{p.bestTry != null ? fmtMoney(p.bestTry) : "—"}</div>
                  <div className="text-xs text-muted">
                    {p.listings.length} mağaza
                    {p.listings.length > 0 && ` · ${[...new Set(p.listings.map((l) => siteLabel(l.site)))].slice(0, 3).join(", ")}`}
                  </div>
                  {errors > 0 && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-bad">
                      <AlertTriangle className="size-3" /> {errors} link kontrol edilemiyor
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
