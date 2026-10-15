"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { setMissingPart } from "@/app/actions/collection";
import { ColorSwatch } from "@/components/ui";
import { toast } from "@/components/toast";

export function MissingRow({
  ownedSetId,
  part,
}: {
  ownedSetId: number;
  part: { partNum: string; colorId: number; quantity: number; partName: string; colorName: string; rgb: string; imgUrl: string | null; inSet: number };
}) {
  const [, start] = useTransition();
  const [qty, setQty] = useOptimistic(part.quantity);
  const save = (v: number) =>
    start(async () => {
      setQty(v);
      const res = await setMissingPart(ownedSetId, part.partNum, part.colorId, v);
      if (!res.ok) toast(res.message ?? "Kaydedilemedi.", "error");
      else if (v === 0) toast("Parça bulundu olarak işaretlendi.", "success");
    });
  return (
    <li className="flex items-center gap-3 p-2.5">
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-tile">
        {part.imgUrl && <img src={part.imgUrl} alt="" loading="lazy" className="h-full w-full object-contain p-1" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{part.partName}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <ColorSwatch rgb={part.rgb} className="size-3" /> {part.colorName} · <span className="font-mono">{part.partNum}</span> · sette {part.inSet}
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1">
        <button type="button" className="flex size-7 items-center justify-center rounded hover:bg-surface-3" onClick={() => save(Math.max(0, qty - 1))} aria-label="Azalt">
          <Minus className="size-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-bold text-bad tabular-nums">{qty}</span>
        <button type="button" className="flex size-7 items-center justify-center rounded hover:bg-surface-3" disabled={qty >= part.inSet} onClick={() => save(qty + 1)} aria-label="Artır">
          <Plus className="size-3.5" />
        </button>
      </div>
      <button type="button" className="btn-ghost btn-sm hidden sm:inline-flex" onClick={() => save(0)} title="Bulundu">
        <Check className="size-4" /> Bulundu
      </button>
    </li>
  );
}
