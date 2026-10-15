"use client";

import { useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addLoosePart, updateLoosePart } from "@/app/actions/collection";
import { toastResult } from "@/components/toast";
import { ColorSwatch } from "@/components/ui";

type Loose = {
  id: number;
  partNum: string;
  colorId: number;
  quantity: number;
  note: string | null;
  partName: string;
  colorName: string;
  rgb: string;
  imgUrl: string | null;
};

export function LoosePartsPanel({ colors, items }: { colors: { id: number; name: string; rgb: string }[]; items: Loose[] }) {
  const [pending, start] = useTransition();
  return (
    <section className="mt-12">
      <h2 className="section-title mb-1">Gevşek parçalar</h2>
      <p className="mb-4 text-sm text-fg-2">Setten bağımsız elindeki parçalar (Pick a Brick, BrickLink, karışık kutular). Hem toplam hem fazlalık havuzuna eklenir.</p>
      <form
        className="card mb-4 grid grid-cols-2 gap-2 p-3 sm:grid-cols-[1fr_1.2fr_100px_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          start(async () => {
            const res = await addLoosePart({
              partNum: String(fd.get("partNum") ?? ""),
              colorId: Number(fd.get("colorId")),
              quantity: Number(fd.get("quantity") || 1),
              note: String(fd.get("note") || "") || null,
            });
            toastResult(res);
            if (res.ok) form.reset();
          });
        }}
      >
        <div>
          <label className="label" htmlFor="lp-part">
            Parça no
          </label>
          <input id="lp-part" name="partNum" required placeholder="3001" className="input h-9 font-mono" />
        </div>
        <div>
          <label className="label" htmlFor="lp-color">
            Renk
          </label>
          <select id="lp-color" name="colorId" required className="input h-9" defaultValue="">
            <option value="" disabled>
              Renk seç
            </option>
            {colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lp-qty">
            Adet
          </label>
          <input id="lp-qty" name="quantity" type="number" min={1} defaultValue={1} className="input h-9" />
        </div>
        <div>
          <label className="label" htmlFor="lp-note">
            Not
          </label>
          <input id="lp-note" name="note" placeholder="İsteğe bağlı" className="input h-9" />
        </div>
        <button className="btn-primary col-span-2 h-9 sm:col-span-1" disabled={pending}>
          <Plus className="size-4" /> Ekle
        </button>
      </form>
      {items.length > 0 && (
        <ul className="card divide-y divide-line">
          {items.map((l) => (
            <li key={l.id} className="flex items-center gap-3 p-2.5">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-tile">
                {l.imgUrl && <img src={l.imgUrl} alt="" loading="lazy" className="h-full w-full object-contain p-1" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{l.partName}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <ColorSwatch rgb={l.rgb} className="size-3" /> {l.colorName} · <span className="font-mono">{l.partNum}</span>
                  {l.note && <span className="truncate">· {l.note}</span>}
                </div>
              </div>
              <input
                type="number"
                min={0}
                defaultValue={l.quantity}
                aria-label="Adet"
                className="input h-9 w-20"
                onBlur={(e) => {
                  const v = Number(e.currentTarget.value);
                  if (v !== l.quantity) start(async () => toastResult(await updateLoosePart(l.id, v), "Güncellendi."));
                }}
              />
              <button type="button" className="btn-ghost size-9 p-0" aria-label="Sil" disabled={pending} onClick={() => start(async () => toastResult(await updateLoosePart(l.id, 0), "Silindi."))}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
