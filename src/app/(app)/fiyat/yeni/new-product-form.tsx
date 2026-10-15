"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createProduct } from "@/app/actions/prices";
import { detectSite, siteLabel, SITES } from "@/lib/price/sites";
import { toast } from "@/components/toast";

export function NewProductForm({ initial }: { initial: { setNum: string; name: string; imgUrl: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [urls, setUrls] = useState<string[]>([""]);

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await createProduct({
            name: String(fd.get("name") ?? ""),
            imgUrl: String(fd.get("imgUrl") ?? "") || null,
            setNum: String(fd.get("setNum") ?? "") || null,
            notes: String(fd.get("notes") ?? "") || null,
            urls: urls.filter((u) => u.trim()),
          });
          if (!res.ok) return toast(res.message ?? "Kaydedilemedi.", "error");
          toast("Ürün eklendi. Fiyatlar bir sonraki otomatik kontrolde gelir.");
          router.push(`/fiyat/${res.id}`);
        });
      }}
    >
      <div>
        <label className="label" htmlFor="np-name">
          Ürün adı
        </label>
        <input id="np-name" name="name" required defaultValue={initial.name} className="input" placeholder="LEGO 76269 Avengers Tower" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="np-set">
            Bağlı LEGO seti (isteğe bağlı)
          </label>
          <input id="np-set" name="setNum" defaultValue={initial.setNum} className="input font-mono" placeholder="76269-1" />
        </div>
        <div>
          <label className="label" htmlFor="np-img">
            Görsel URL (isteğe bağlı)
          </label>
          <input id="np-img" name="imgUrl" type="url" defaultValue={initial.imgUrl} className="input" />
        </div>
      </div>
      <div>
        <div className="label">Mağaza linkleri</div>
        <div className="space-y-2">
          {urls.map((u, i) => {
            const site = u.trim() ? detectSite(u) : null;
            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={u}
                  onChange={(e) => setUrls((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                  type="url"
                  className="input"
                  placeholder="https://www.lego.com/tr-tr/product/…"
                  aria-label={`Link ${i + 1}`}
                />
                {site && <span className="shrink-0 text-xs text-muted">{siteLabel(site.id)}</span>}
                {urls.length > 1 && (
                  <button type="button" className="btn-ghost size-9 shrink-0 p-0" aria-label="Linki kaldır" onClick={() => setUrls((cur) => cur.filter((_, j) => j !== i))}>
                    <X className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setUrls((cur) => [...cur, ""])}>
          <Plus className="size-3.5" /> Link ekle
        </button>
        <p className="mt-2 text-xs text-muted">Desteklenen: {SITES.map((s) => s.label).join(", ")}.</p>
      </div>
      <div>
        <label className="label" htmlFor="np-notes">
          Not
        </label>
        <input id="np-notes" name="notes" className="input" />
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Takibe başla"}
      </button>
    </form>
  );
}
