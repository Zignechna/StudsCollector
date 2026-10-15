"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import type { SetRow } from "@/lib/queries/sets";
import { fmtNum, setNumDisplay } from "@/lib/format";
import { AddSetDialog } from "@/components/add-set-dialog";
import { SetImage } from "@/components/set-card";
import { WishlistButton } from "@/components/wishlist-button";

type Remote = { setNum: string; name: string; year: number; numParts: number; imgUrl: string | null };

export function AddSetSearch({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SetRow[]>([]);
  const [remote, setRemote] = useState<Remote[]>([]);
  const active = q.trim().length >= 2;
  const shownResults = active ? results : [];
  const shownRemote = active ? remote : [];
  const [dialog, setDialog] = useState<{ setNum: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/sets?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { results: SetRow[]; remote: Remote[] };
        setResults(json.results ?? []);
        setRemote(json.remote ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div>
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="10300, Millennium Falcon, Avengers Tower…"
          aria-label="Set ara"
          className="input h-14 rounded-xl pl-12 text-base"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted" />}
      </div>

      {q.trim().length >= 2 && !loading && shownResults.length === 0 && shownRemote.length === 0 && (
        <p className="text-sm text-muted">Sonuç bulunamadı. Set numarasını tire ile deneyebilirsin (ör. 76269-1).</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {shownResults.map((s) => (
          <li key={s.setNum} className="card flex items-center gap-3 p-2.5">
            <Link href={`/set/${encodeURIComponent(s.setNum)}`} className="shrink-0 overflow-hidden rounded-lg ring-1 ring-line">
              <SetImage src={s.imgUrl} alt={s.name} className="h-20 w-24" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/set/${encodeURIComponent(s.setNum)}`} className="line-clamp-2 text-sm font-semibold hover:text-accent">
                {s.name}
              </Link>
              <div className="text-xs text-muted">
                <span className="font-mono">{setNumDisplay(s.setNum)}</span> · {s.year} · {fmtNum(s.numParts)} parça
              </div>
              {s.themeName && <div className="truncate text-xs text-muted">{s.themeName}</div>}
              {s.ownedCount > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-good">
                  <Check className="size-3.5" /> Koleksiyonda{s.ownedCount > 1 ? ` (×${s.ownedCount})` : ""}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <button type="button" className="btn-primary size-10 p-0" aria-label={`${s.name} ekle`} onClick={() => setDialog({ setNum: s.setNum, name: s.name })}>
                <Plus className="size-5" />
              </button>
              <WishlistButton setNum={s.setNum} active={s.inWishlist} owned={false} inline />
            </div>
          </li>
        ))}
        {shownRemote.map((s) => (
          <li key={s.setNum} className="card flex items-center gap-3 p-2.5">
            <SetImage src={s.imgUrl} alt={s.name} className="h-20 w-24 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold">{s.name}</div>
              <div className="text-xs text-muted">
                <span className="font-mono">{s.setNum}</span> · {s.year} · {fmtNum(s.numParts)} parça
              </div>
              <div className="text-[11px] text-info">Yeni set (Rebrickable)</div>
            </div>
            <button type="button" className="btn-primary size-10 p-0" aria-label={`${s.name} ekle`} onClick={() => setDialog({ setNum: s.setNum, name: s.name })}>
              <Plus className="size-5" />
            </button>
          </li>
        ))}
      </ul>

      {dialog && <AddSetDialog setNum={dialog.setNum} name={dialog.name} onClose={() => setDialog(null)} />}
    </div>
  );
}
