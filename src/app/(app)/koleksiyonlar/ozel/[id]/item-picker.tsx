"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toggleCollectionItem } from "@/app/actions/collection";
import { toastResult } from "@/components/toast";
import { setNumDisplay } from "@/lib/format";

type Result = { kind: "set" | "fig"; id: string; name: string; imgUrl: string | null; meta: string };

export function ItemPicker({ collectionId }: { collectionId: number }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"set" | "fig">("set");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/${kind === "set" ? "sets" : "minifigs"}?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (kind === "set") {
          setResults(
            (json.results ?? []).map((s: { setNum: string; name: string; imgUrl: string | null; year: number; themeName: string | null }) => ({
              kind: "set",
              id: s.setNum,
              name: s.name,
              imgUrl: s.imgUrl,
              meta: `${setNumDisplay(s.setNum)} · ${s.year}${s.themeName ? ` · ${s.themeName}` : ""}`,
            })),
          );
        } else {
          setResults(
            (json.results ?? []).map((f: { figNum: string; name: string; imgUrl: string | null }) => ({
              kind: "fig",
              id: f.figNum,
              name: f.name,
              imgUrl: f.imgUrl,
              meta: f.figNum,
            })),
          );
        }
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
  }, [q, kind]);

  return (
    <div className="card mb-8 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-sm font-bold uppercase tracking-wide">Ekle</h2>
        <button type="button" className={`chip ${kind === "set" ? "chip-active" : ""}`} onClick={() => setKind("set")}>
          Set
        </button>
        <button type="button" className={`chip ${kind === "fig" ? "chip-active" : ""}`} onClick={() => setKind("fig")}>
          Minifigür
        </button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={kind === "set" ? "Set adı veya numarası (ör. 76218 Sanctum Sanctorum)" : "Figür adı veya numarası"}
          className="input pl-9"
          aria-label="Eklenecek öğeyi ara"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />}
      </div>
      {q.trim().length >= 2 && results.length > 0 && (
        <ul className="mt-3 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border border-line p-2">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-tile">
                {r.imgUrl && <img src={r.imgUrl} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{r.name}</div>
                <div className="truncate text-xs text-muted">{r.meta}</div>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={pending}
                onClick={() => start(async () => toastResult(await toggleCollectionItem(collectionId, r.kind === "set" ? { setNum: r.id } : { figNum: r.id })))}
              >
                <Plus className="size-3.5" /> Ekle / çıkar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
