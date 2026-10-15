import { Check, CircleUserRound, Lock } from "lucide-react";
import type { FigRow } from "@/lib/queries/minifigs";
import { MinifigOwnButton } from "./minifig-own-button";

export function FigCard({ fig }: { fig: FigRow }) {
  const owned = fig.ownedQty > 0;
  return (
    <div className={`group ${owned ? "" : "locked"}`}>
      <div className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-tile ring-1 ${owned ? "ring-good/40" : "ring-line"}`}>
        {fig.imgUrl ? (
          <img src={fig.imgUrl} alt={fig.name} loading="lazy" decoding="async" className="h-full w-full object-contain p-2" />
        ) : (
          <CircleUserRound className="size-10 text-neutral-300" />
        )}
        {owned ? (
          <span className="badge absolute left-1.5 top-1.5 bg-good text-white shadow">
            <Check className="size-3" strokeWidth={3} /> {fig.ownedQty > 1 ? `×${fig.ownedQty}` : "Var"}
          </span>
        ) : (
          <span className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white/90">
            <Lock className="size-3" />
          </span>
        )}
      </div>
      <div className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug" title={fig.name}>
        {fig.name}
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-mono text-[10px] text-muted">
          {fig.figNum}
          {fig.fromSets > 0 ? ` · ${fig.fromSets} setten` : ""}
        </span>
        <MinifigOwnButton figNum={fig.figNum} looseQty={fig.looseQty} />
      </div>
    </div>
  );
}

export function FigGrid({ figs }: { figs: FigRow[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9">
      {figs.map((f) => (
        <FigCard key={f.figNum} fig={f} />
      ))}
    </div>
  );
}
