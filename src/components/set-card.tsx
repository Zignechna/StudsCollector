import Link from "next/link";
import { Check, Clock, ImageOff, Lock } from "lucide-react";
import type { SetRow } from "@/lib/queries/sets";
import { fmtMonth, fmtNum, humanizeDays, relativeDays, setNumDisplay } from "@/lib/format";
import { effectiveExit, retirementStatus } from "@/lib/retirement";
import { WishlistButton } from "./wishlist-button";

export function RetirementLine({ set, compact = false }: { set: SetRow; compact?: boolean }) {
  const status = retirementStatus(set);
  const exit = effectiveExit(set);
  const days = relativeDays(exit);
  const manual = Boolean(set.exitDateManual);
  if (status === "unknown") {
    return <div className="text-[11px] text-muted">Emeklilik: bilinmiyor</div>;
  }
  const tone =
    status === "retiring" ? "text-warn font-semibold" : status === "retired" ? "text-muted" : "text-fg-2";
  return (
    <div className={`flex items-center gap-1 text-[11px] ${tone}`} title={manual ? "Elle girilen tahmini tarih" : "Brickset"}>
      {status === "retiring" && <Clock className="size-3 shrink-0" />}
      <span className="truncate">
        {status === "retired" ? "Emekli" : "Emeklilik"}: {fmtMonth(exit)}
        {manual ? "*" : ""}
        {!compact && status === "retiring" && days != null ? ` · ${humanizeDays(days)}` : ""}
      </span>
    </div>
  );
}

export function SetImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-tile ${className}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-contain p-2" />
      ) : (
        <ImageOff className="size-8 text-neutral-300" />
      )}
    </div>
  );
}

export function SetCard({ set, showTheme = false }: { set: SetRow; showTheme?: boolean }) {
  const owned = set.ownedCount > 0;
  const status = retirementStatus(set);
  return (
    <div className={`group relative flex flex-col ${owned ? "" : "locked"}`}>
      <Link
        href={`/set/${encodeURIComponent(set.setNum)}`}
        className={`relative block overflow-hidden rounded-lg ring-1 transition ${
          owned ? "ring-good/40 hover:ring-good" : "ring-line hover:ring-line-strong"
        }`}
      >
        <SetImage src={set.imgUrl} alt={set.name} className="aspect-[4/3]" />
        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          {owned && (
            <span className="badge bg-good text-white shadow">
              <Check className="size-3" strokeWidth={3} />
              {set.ownedCount > 1 ? `×${set.ownedCount}` : "Var"}
            </span>
          )}
          {status === "retiring" && <span className="badge bg-warn text-white shadow">Son aylar</span>}
        </div>
        {!owned && (
          <span className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white/90 opacity-80">
            <Lock className="size-3" />
          </span>
        )}
      </Link>
      <div className="absolute right-1.5 top-1.5">
        <WishlistButton setNum={set.setNum} active={set.inWishlist} owned={owned} />
      </div>
      <div className="mt-2 min-w-0 px-0.5">
        <Link
          href={`/set/${encodeURIComponent(set.setNum)}`}
          className={`line-clamp-2 text-[13px] font-semibold leading-snug hover:text-accent ${owned ? "text-fg" : "text-fg-2"}`}
        >
          {set.name}
        </Link>
        <div className="mt-0.5 truncate text-[11px] text-muted">
          <span className="font-mono">{setNumDisplay(set.setNum)}</span>
          {set.year ? ` · ${set.year}` : ""} · {fmtNum(set.numParts)} parça
        </div>
        {showTheme && set.themeName && <div className="truncate text-[11px] text-muted">{set.themeName}</div>}
        <RetirementLine set={set} compact />
      </div>
    </div>
  );
}

export function SetGrid({ sets, showTheme = false }: { sets: SetRow[]; showTheme?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {sets.map((s) => (
        <SetCard key={s.setNum} set={s} showTheme={showTheme} />
      ))}
    </div>
  );
}

export function SetList({ sets }: { sets: SetRow[] }) {
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {sets.map((s) => {
        const owned = s.ownedCount > 0;
        return (
          <div key={s.setNum} className={`flex items-center gap-3 p-2.5 sm:gap-4 ${owned ? "" : "locked"}`}>
            <Link href={`/set/${encodeURIComponent(s.setNum)}`} className="shrink-0 overflow-hidden rounded-md ring-1 ring-line">
              <SetImage src={s.imgUrl} alt={s.name} className="h-14 w-20" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/set/${encodeURIComponent(s.setNum)}`} className="line-clamp-1 text-sm font-semibold hover:text-accent">
                {s.name}
              </Link>
              <div className="truncate text-xs text-muted">
                <span className="font-mono">{setNumDisplay(s.setNum)}</span> · {s.year} · {fmtNum(s.numParts)} parça
                {s.themeName ? ` · ${s.themeName}` : ""}
              </div>
              <RetirementLine set={s} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {owned && (
                <span className="badge bg-good-soft text-good">
                  <Check className="size-3" /> {s.ownedCount > 1 ? `×${s.ownedCount}` : "Var"}
                </span>
              )}
              <WishlistButton setNum={s.setNum} active={s.inWishlist} owned={owned} inline />
            </div>
          </div>
        );
      })}
    </div>
  );
}
