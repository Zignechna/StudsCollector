"use client";

import { useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { addOwnedMinifig, setOwnedMinifigQuantity } from "@/app/actions/collection";
import { toastResult } from "./toast";

/** Adds a single loose figure (e.g. from a CMF pack) or adjusts the loose count. */
export function MinifigOwnButton({ figNum, looseQty = 0, compact = true }: { figNum: string; looseQty?: number; compact?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-0.5">
      {looseQty > 0 && (
        <button
          type="button"
          disabled={pending}
          className="flex size-6 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Tek figür adedini azalt"
          title="Tek figür adedini azalt"
          onClick={() => start(async () => toastResult(await setOwnedMinifigQuantity(figNum, looseQty - 1), "Güncellendi."))}
        >
          <Minus className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className={compact ? "flex size-6 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-accent" : "btn-secondary btn-sm"}
        aria-label="Tek figür olarak ekle"
        title="Tek figür olarak ekle (ör. CMF paketi)"
        onClick={() => start(async () => toastResult(await addOwnedMinifig(figNum, 1)))}
      >
        <Plus className="size-3.5" />
        {!compact && "Figürü ekle"}
      </button>
    </span>
  );
}
