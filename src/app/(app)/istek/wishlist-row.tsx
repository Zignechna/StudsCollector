"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, ShoppingBag, Star, TrendingDown, X } from "lucide-react";
import type { SetRow } from "@/lib/queries/sets";
import { fmtMoney, fmtNum, setNumDisplay } from "@/lib/format";
import { retirementStatus } from "@/lib/retirement";
import { toggleWishlist, updateWishlistItem } from "@/app/actions/collection";
import { AddSetDialog } from "@/components/add-set-dialog";
import { RetirementLine, SetImage } from "@/components/set-card";
import { toastResult } from "@/components/toast";

const PRIORITY_LABELS = ["", "Çok yüksek", "Yüksek", "Orta", "Düşük", "Bir gün"];

export function WishlistRow({ set, note, price }: { set: SetRow; note: string | null; price: { bestTry: number | null; dropped: boolean } | null }) {
  const [pending, start] = useTransition();
  const [priority, setPriority] = useState(set.wishPriority ?? 3);
  const [dialog, setDialog] = useState(false);
  const retiring = retirementStatus(set) === "retiring";
  const href = `/set/${encodeURIComponent(set.setNum)}`;

  const save = (p: number, n: string | null) => start(async () => toastResult(await updateWishlistItem(set.setNum, p, n)));

  return (
    <div className={`card flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${retiring ? "border-warn/50" : ""}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link href={href} className="shrink-0 overflow-hidden rounded-lg ring-1 ring-line">
          <SetImage src={set.imgUrl} alt={set.name} className="h-20 w-24 sm:h-24 sm:w-32" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="line-clamp-2 font-semibold hover:text-accent">
            {set.name}
          </Link>
          <div className="text-xs text-muted">
            <span className="font-mono">{setNumDisplay(set.setNum)}</span> · {set.year} · {fmtNum(set.numParts)} parça
            {set.themeName ? ` · ${set.themeName}` : ""}
          </div>
          <RetirementLine set={set} />
          {set.ownedCount > 0 && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-good">
              <Check className="size-3" /> Zaten {set.ownedCount} kopyan var
            </div>
          )}
          {price?.bestTry != null && (
            <Link href={`${href}?tab=price`} className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${price.dropped ? "text-good" : "text-fg-2"}`}>
              {price.dropped && <TrendingDown className="size-3.5" />}
              En iyi fiyat: {fmtMoney(price.bestTry)}
              {price.dropped && <span className="badge bg-good text-white">Düştü</span>}
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:w-[420px] sm:flex-nowrap">
        <div className="flex items-center" role="radiogroup" aria-label="Öncelik">
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={priority === 6 - p}
              title={`Öncelik: ${PRIORITY_LABELS[6 - p]}`}
              onClick={() => {
                setPriority(6 - p);
                save(6 - p, note);
              }}
              className="p-0.5"
            >
              <Star className={`size-4 ${p <= 6 - priority ? "fill-accent text-accent" : "text-surface-3"}`} />
            </button>
          ))}
        </div>
        <input
          defaultValue={note ?? ""}
          placeholder="Not…"
          aria-label="Not"
          className="input h-9 min-w-0 flex-1"
          onBlur={(e) => e.currentTarget.value !== (note ?? "") && save(priority, e.currentTarget.value)}
        />
        <button type="button" className="btn-primary btn-sm h-9" onClick={() => setDialog(true)} title="Aldım — koleksiyona ekle">
          <ShoppingBag className="size-4" /> Aldım
        </button>
        <button
          type="button"
          className="btn-ghost size-9 p-0"
          disabled={pending}
          aria-label="Listeden çıkar"
          onClick={() => start(async () => toastResult(await toggleWishlist(set.setNum)))}
        >
          <X className="size-4" />
        </button>
      </div>
      {dialog && <AddSetDialog setNum={set.setNum} name={set.name} onClose={() => setDialog(false)} />}
    </div>
  );
}
