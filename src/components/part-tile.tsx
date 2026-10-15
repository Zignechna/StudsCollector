"use client";

import { Minus, Plus, Puzzle } from "lucide-react";
import { ColorSwatch } from "./ui";

export type PartTileData = {
  partNum: string;
  colorId: number;
  partName: string;
  colorName: string;
  rgb: string;
  isTrans?: boolean;
  imgUrl: string | null;
  quantity: number;
  isSpare?: boolean;
};

export function PartTile({
  part,
  marked,
  markLabel,
  onMark,
  max,
  dimmed = false,
  badge,
}: {
  part: PartTileData;
  marked?: number;
  markLabel?: string;
  onMark?: (qty: number) => void;
  max?: number;
  dimmed?: boolean;
  badge?: React.ReactNode;
}) {
  const limit = max ?? part.quantity;
  const isMarked = (marked ?? 0) > 0;
  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-lg border bg-surface transition ${
        isMarked ? "border-bad/60 ring-1 ring-bad/30" : "border-line"
      } ${dimmed ? "opacity-60" : ""}`}
      title={`${part.partName} — ${part.colorName} (${part.partNum})`}
    >
      <div className="relative flex aspect-square items-center justify-center bg-tile">
        {part.imgUrl ? (
          <img src={part.imgUrl} alt={part.partName} loading="lazy" decoding="async" className="h-full w-full object-contain p-1.5" />
        ) : (
          <Puzzle className="size-8 text-neutral-300" />
        )}
        <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 font-display text-sm font-bold leading-none text-white tabular-nums">
          ×{part.quantity}
        </span>
        {part.isSpare && <span className="badge absolute right-1 top-1 bg-info text-white">Yedek</span>}
        {badge && <span className="absolute bottom-1 right-1">{badge}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-1.5">
        <div className="flex items-center gap-1.5">
          <ColorSwatch rgb={part.rgb} isTrans={part.isTrans} className="size-3" />
          <span className="truncate text-[10px] text-muted">{part.colorName}</span>
        </div>
        <div className="truncate font-mono text-[10px] text-fg-2">{part.partNum}</div>
        {onMark && (
          <div className="mt-1 flex items-center justify-between gap-1 rounded-md bg-surface-2 p-0.5">
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded text-fg-2 hover:bg-surface-3 disabled:opacity-30"
              disabled={!marked}
              onClick={() => onMark(Math.max(0, (marked ?? 0) - 1))}
              aria-label={`${markLabel ?? "İşaret"} azalt`}
            >
              <Minus className="size-3" />
            </button>
            <span className={`text-[11px] font-bold tabular-nums ${isMarked ? "text-bad" : "text-muted"}`}>{marked ?? 0}</span>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded text-fg-2 hover:bg-surface-3 disabled:opacity-30"
              disabled={(marked ?? 0) >= limit}
              onClick={() => onMark(Math.min(limit, (marked ?? 0) + 1))}
              aria-label={`${markLabel ?? "İşaret"} artır`}
            >
              <Plus className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PartGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">{children}</div>;
}
