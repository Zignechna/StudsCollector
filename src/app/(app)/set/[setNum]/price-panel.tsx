import Link from "next/link";
import { Plus, TrendingDown } from "lucide-react";
import { getProductsForSet } from "@/lib/queries/prices";
import { fmtMoney } from "@/lib/format";
import { siteLabel } from "@/lib/price/sites";

export async function PricePanel({ setNum, name, imgUrl }: { setNum: string; name: string; imgUrl: string | null }) {
  const products = await getProductsForSet(setNum);
  const newHref = `/fiyat/yeni?set=${encodeURIComponent(setNum)}&name=${encodeURIComponent(name)}${imgUrl ? `&img=${encodeURIComponent(imgUrl)}` : ""}`;
  if (!products.length) {
    return (
      <div className="card flex flex-col items-center p-8 text-center">
        <TrendingDown className="mb-2 size-8 text-muted" />
        <p className="text-sm text-fg-2">Bu set için fiyat takibi yok. Mağaza linklerini ekle, fiyat düşünce bildirim gelsin.</p>
        <Link href={newHref} className="btn-primary mt-4">
          <Plus className="size-4" /> Fiyat takibi başlat
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {products.map((p) => (
        <Link key={p.id} href={`/fiyat/${p.id}`} className="card block p-4 transition hover:border-line-strong">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{p.name}</div>
            {p.dropped && <span className="badge bg-good text-white">Fiyat düştü</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.listings.map((l) => (
              <span key={l.id} className={`rounded-lg border px-2.5 py-1.5 text-xs ${l.status === "error" ? "border-bad/40 text-bad" : "border-line"}`}>
                <span className="text-muted">{siteLabel(l.site)}: </span>
                <span className="font-semibold">{l.status === "error" ? "kontrol edilemiyor" : fmtMoney(l.lastPrice, l.currency)}</span>
              </span>
            ))}
          </div>
        </Link>
      ))}
      <Link href={newHref} className="btn-secondary">
        <Plus className="size-4" /> Yeni ürün takibi
      </Link>
    </div>
  );
}
