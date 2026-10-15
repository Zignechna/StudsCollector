import { Check, CircleUserRound } from "lucide-react";
import type { SetMinifig } from "@/lib/queries/set-detail";
import { MinifigOwnButton } from "@/components/minifig-own-button";

export function MinifigsPanel({ minifigs }: { minifigs: SetMinifig[] }) {
  if (!minifigs.length) return <p className="text-sm text-muted">Bu sette minifigür yok.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
      {minifigs.map((m) => (
        <div key={m.figNum} className={`group ${m.ownedQty > 0 ? "" : "locked"}`}>
          <div className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-tile ring-1 ${m.ownedQty ? "ring-good/40" : "ring-line"}`}>
            {m.imgUrl ? <img src={m.imgUrl} alt={m.name} loading="lazy" className="h-full w-full object-contain p-2" /> : <CircleUserRound className="size-10 text-neutral-300" />}
            {m.quantity > 1 && <span className="absolute left-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-bold text-white">×{m.quantity}</span>}
            {m.ownedQty > 0 && (
              <span className="badge absolute right-1.5 top-1.5 bg-good text-white">
                <Check className="size-3" /> {m.ownedQty}
              </span>
            )}
          </div>
          <div className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug">{m.name}</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted">{m.figNum}</span>
            <MinifigOwnButton figNum={m.figNum} />
          </div>
        </div>
      ))}
    </div>
  );
}
