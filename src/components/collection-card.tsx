import Link from "next/link";
import { Layers } from "lucide-react";
import { ProgressBar, ProgressLabel } from "./ui";

export function CollectionCard({
  href,
  name,
  owned,
  total,
  coverImg,
  eyebrow,
  wished,
  nameLang = "en",
}: {
  href: string;
  name: string;
  owned: number;
  total: number;
  coverImg: string | null;
  eyebrow?: string;
  wished?: number;
  /** catalog names are English; custom collection names are Turkish */
  nameLang?: string;
}) {
  const started = owned > 0;
  return (
    <Link
      href={href}
      className={`group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-line-strong ${started ? "" : "locked"}`}
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-tile">
        {coverImg ? (
          <img src={coverImg} alt="" loading="lazy" className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <Layers className="size-10 text-neutral-300" />
        )}
        {owned === total && total > 0 && (
          <span className="badge absolute right-2 top-2 bg-good text-white shadow">Tamamlandı</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          {eyebrow && <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted">{eyebrow}</div>}
          <div lang={nameLang} className="line-clamp-1 font-display text-lg font-bold uppercase leading-tight tracking-wide text-fg group-hover:text-accent">
            {name}
          </div>
        </div>
        <div className="mt-auto space-y-1.5">
          <ProgressLabel owned={owned} total={total} />
          <ProgressBar owned={owned} total={total} size="sm" />
          {wished ? <div className="text-[11px] text-info">{wished} istek listesinde</div> : null}
        </div>
      </div>
    </Link>
  );
}
