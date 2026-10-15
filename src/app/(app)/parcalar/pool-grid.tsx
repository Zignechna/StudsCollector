import type { PoolRow } from "@/lib/queries/parts";
import { ColorSwatch } from "@/components/ui";
import { Puzzle } from "lucide-react";

export function PoolGrid({ rows }: { rows: PoolRow[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
      {rows.map((p) => (
        <div key={`${p.partNum}|${p.colorId}`} className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface" title={`${p.partName} — ${p.colorName}`}>
          <div className="relative flex aspect-square items-center justify-center bg-tile">
            {p.imgUrl ? (
              <img src={p.imgUrl} alt={p.partName} loading="lazy" decoding="async" className="h-full w-full object-contain p-1.5" />
            ) : (
              <Puzzle className="size-8 text-neutral-300" />
            )}
            <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 font-display text-sm font-bold leading-none text-white tabular-nums">×{p.qty}</span>
          </div>
          <div className="space-y-0.5 p-1.5">
            <div className="line-clamp-1 text-[11px] font-semibold">{p.partName}</div>
            <div className="flex items-center gap-1.5">
              <ColorSwatch rgb={p.rgb} isTrans={p.isTrans} className="size-3" />
              <span className="truncate text-[10px] text-muted">{p.colorName}</span>
            </div>
            <div className="truncate font-mono text-[10px] text-fg-2">{p.partNum}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
