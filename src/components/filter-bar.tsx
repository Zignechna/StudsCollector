"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import {
  countActiveFilters,
  ownershipLabels,
  parseSetFilters,
  sortLabels,
  statusFilterLabels,
  type Ownership,
  type SetFilters,
  type SortKey,
  type StatusFilter,
} from "@/lib/filters";

export type ThemeOption = { id: number; name: string; depth: number; total: number };

type Props = {
  themes?: ThemeOption[];
  defaults?: Partial<SetFilters>;
  hide?: ("themes" | "own" | "status" | "year" | "parts" | "view")[];
  sorts?: SortKey[];
  total?: number;
};

function useFilterNav(defaults: Partial<SetFilters>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const filters = useMemo(() => parseSetFilters(Object.fromEntries(params.entries()), defaults), [params, defaults]);

  const update = (patch: Record<string, string | number | null | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { filters, update, pending, params };
}

function Popover({ label, active, children, align = "left" }: { label: React.ReactNode; active?: boolean; children: React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`chip ${active ? "chip-active" : ""}`} aria-expanded={open}>
        {label}
        <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute top-10 z-30 w-72 rounded-xl border border-line bg-surface p-3 shadow-card ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ThemePicker({ themes, selected, onChange }: { themes: ThemeOption[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState("");
  const list = q ? themes.filter((t) => t.name.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr"))) : themes;
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div>
      <input className="input mb-2 h-9" placeholder="Tema ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="max-h-72 overflow-y-auto pr-1">
        {list.map((t) => (
          <li key={t.id}>
            <label
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2"
              style={{ paddingLeft: q ? 8 : 8 + t.depth * 14 }}
            >
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
              <span className={`flex-1 truncate ${t.depth === 0 ? "font-semibold" : "text-fg-2"}`}>{t.name}</span>
              <span className="text-[11px] tabular-nums text-muted">{t.total}</span>
            </label>
          </li>
        ))}
        {!list.length && <li className="px-2 py-3 text-sm text-muted">Sonuç yok</li>}
      </ul>
      {selected.length > 0 && (
        <button type="button" className="btn-ghost btn-sm mt-2 w-full" onClick={() => onChange([])}>
          Seçimi temizle ({selected.length})
        </button>
      )}
    </div>
  );
}

function RangeInputs({
  minName,
  maxName,
  min,
  max,
  onApply,
  placeholder,
}: {
  minName: string;
  maxName: string;
  min: number | null;
  max: number | null;
  onApply: (min: string, max: string) => void;
  placeholder: [string, string];
}) {
  const [a, setA] = useState(min?.toString() ?? "");
  const [b, setB] = useState(max?.toString() ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(a, b);
      }}
      className="flex items-center gap-2"
    >
      <input name={minName} inputMode="numeric" className="input h-9" placeholder={placeholder[0]} value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} />
      <span className="text-muted">–</span>
      <input name={maxName} inputMode="numeric" className="input h-9" placeholder={placeholder[1]} value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ""))} />
      <button className="btn-primary btn-sm h-9">Uygula</button>
    </form>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  allLabel = "Tümü",
}: {
  options: Record<T, string>;
  value: T | null;
  onChange: (v: T | null) => void;
  allLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className={`chip ${value === null ? "chip-active" : ""}`} onClick={() => onChange(null)}>
        {allLabel}
      </button>
      {(Object.keys(options) as T[]).map((k) => (
        <button key={k} type="button" className={`chip ${value === k ? "chip-active" : ""}`} onClick={() => onChange(value === k ? null : k)}>
          {options[k]}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({ themes = [], defaults = {}, hide = [], sorts, total }: Props) {
  const { filters, update, pending } = useFilterNav(defaults);
  const [q, setQ] = useState(filters.q);
  const [sheet, setSheet] = useState(false);
  const show = (k: NonNullable<Props["hide"]>[number]) => !hide.includes(k);
  const sortKeys = sorts ?? (Object.keys(sortLabels) as SortKey[]);
  const activeCount = countActiveFilters(filters) - (filters.own && filters.own === defaults.own ? 1 : 0);

  // debounce search typing
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (q !== filters.q) update({ q });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const ownValue = filters.own;
  const setOwn = (v: Ownership | null) => update({ own: v ?? (defaults.own ? "all" : null) });
  const setStatus = (v: StatusFilter | null) => update({ status: v });
  const setThemes = (ids: number[]) => update({ themes: ids.join(",") || null });
  const themeNames = filters.themes.map((id) => themes.find((t) => t.id === id)?.name).filter(Boolean);

  const sortControl = (
    <div className="flex items-center gap-1">
      <label className="sr-only" htmlFor="sort">
        Sıralama
      </label>
      <select
        id="sort"
        className="input h-8 w-auto rounded-full py-0 pr-8 text-xs font-semibold"
        value={filters.sort}
        onChange={(e) => update({ sort: e.target.value })}
      >
        {sortKeys.map((k) => (
          <option key={k} value={k}>
            {sortLabels[k]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="chip px-2"
        onClick={() => update({ dir: filters.dir === "asc" ? "desc" : "asc" })}
        aria-label={filters.dir === "asc" ? "Artan sıralama" : "Azalan sıralama"}
        title={filters.dir === "asc" ? "Artan" : "Azalan"}
      >
        {filters.dir === "asc" ? <ArrowUpNarrowWide className="size-4" /> : <ArrowDownWideNarrow className="size-4" />}
      </button>
    </div>
  );

  const viewToggle = show("view") && (
    <div className="flex rounded-full border border-line bg-surface p-0.5">
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => update({ view: v === "grid" ? null : v })}
          className={`flex size-7 items-center justify-center rounded-full ${filters.view === v ? "bg-surface-3 text-fg" : "text-muted"}`}
          aria-label={v === "grid" ? "Izgara görünümü" : "Liste görünümü"}
        >
          {v === "grid" ? <LayoutGrid className="size-3.5" /> : <List className="size-3.5" />}
        </button>
      ))}
    </div>
  );

  const panels = (
    <>
      {show("own") && (
        <div>
          <div className="label">Sahiplik</div>
          <ChipGroup options={ownershipLabels} value={ownValue} onChange={setOwn} />
        </div>
      )}
      {show("status") && (
        <div>
          <div className="label">Durum</div>
          <ChipGroup options={statusFilterLabels} value={filters.status} onChange={setStatus} />
        </div>
      )}
      {show("year") && (
        <div>
          <div className="label">Yıl aralığı</div>
          <RangeInputs
            key={`y${filters.yearMin}-${filters.yearMax}`}
            minName="yearMin"
            maxName="yearMax"
            min={filters.yearMin}
            max={filters.yearMax}
            placeholder={["1949", String(new Date().getFullYear() + 1)]}
            onApply={(a, b) => update({ yearMin: a, yearMax: b })}
          />
        </div>
      )}
      {show("parts") && (
        <div>
          <div className="label">Parça sayısı</div>
          <RangeInputs
            key={`p${filters.partsMin}-${filters.partsMax}`}
            minName="partsMin"
            maxName="partsMax"
            min={filters.partsMin}
            max={filters.partsMax}
            placeholder={["0", "10000"]}
            onApply={(a, b) => update({ partsMin: a, partsMax: b })}
          />
        </div>
      )}
    </>
  );

  return (
    <div className={`mb-5 transition-opacity ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-64 sm:flex-none lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim veya set no…"
            aria-label="İsim veya set numarası ara"
            className="input h-9 rounded-full pl-9"
          />
          {q && (
            <button type="button" aria-label="Aramayı temizle" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Desktop: inline popovers */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {show("themes") && themes.length > 0 && (
            <Popover label={filters.themes.length ? `Tema (${filters.themes.length})` : "Tema"} active={filters.themes.length > 0}>
              <ThemePicker themes={themes} selected={filters.themes} onChange={setThemes} />
            </Popover>
          )}
          {show("own") && (
            <Popover label={ownValue ? ownershipLabels[ownValue] : "Sahiplik"} active={Boolean(ownValue)}>
              <ChipGroup options={ownershipLabels} value={ownValue} onChange={setOwn} />
            </Popover>
          )}
          {show("status") && (
            <Popover label={filters.status ? statusFilterLabels[filters.status] : "Durum"} active={Boolean(filters.status)}>
              <ChipGroup options={statusFilterLabels} value={filters.status} onChange={setStatus} />
            </Popover>
          )}
          {show("year") && (
            <Popover
              label={filters.yearMin || filters.yearMax ? `Yıl ${filters.yearMin ?? ""}–${filters.yearMax ?? ""}` : "Yıl"}
              active={Boolean(filters.yearMin || filters.yearMax)}
            >
              <RangeInputs
                key={`y${filters.yearMin}-${filters.yearMax}`}
                minName="yearMin"
                maxName="yearMax"
                min={filters.yearMin}
                max={filters.yearMax}
                placeholder={["1949", String(new Date().getFullYear() + 1)]}
                onApply={(a, b) => update({ yearMin: a, yearMax: b })}
              />
            </Popover>
          )}
          {show("parts") && (
            <Popover
              label={filters.partsMin || filters.partsMax ? `Parça ${filters.partsMin ?? 0}–${filters.partsMax ?? "∞"}` : "Parça sayısı"}
              active={Boolean(filters.partsMin || filters.partsMax)}
            >
              <RangeInputs
                key={`p${filters.partsMin}-${filters.partsMax}`}
                minName="partsMin"
                maxName="partsMax"
                min={filters.partsMin}
                max={filters.partsMax}
                placeholder={["0", "10000"]}
                onApply={(a, b) => update({ partsMin: a, partsMax: b })}
              />
            </Popover>
          )}
        </div>

        {/* Mobile / tablet: sheet */}
        <button type="button" className={`chip lg:hidden ${activeCount > 0 ? "chip-active" : ""}`} onClick={() => setSheet(true)}>
          <SlidersHorizontal className="size-3.5" />
          Filtreler{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {sortControl}
          {viewToggle}
        </div>
      </div>

      {(activeCount > 0 || total !== undefined) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {total !== undefined && (
            <span>
              <span className="font-semibold tabular-nums text-fg">{total.toLocaleString("tr-TR")}</span> sonuç
            </span>
          )}
          {themeNames.map((n, i) => (
            <button key={i} type="button" className="badge bg-surface-2 py-1 text-fg-2 normal-case" onClick={() => setThemes(filters.themes.filter((_, j) => j !== i))}>
              {n} <X className="size-3" />
            </button>
          ))}
          {activeCount > 0 && (
            <button
              type="button"
              className="font-semibold text-accent hover:underline"
              onClick={() => {
                setQ("");
                update({ q: null, themes: null, yearMin: null, yearMax: null, own: null, status: null, partsMin: null, partsMax: null });
              }}
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtreler">
          <button className="absolute inset-0 bg-black/60" aria-label="Kapat" onClick={() => setSheet(false)} />
          <div className="pb-safe absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Filtreler</h2>
              <button className="btn-primary btn-sm" onClick={() => setSheet(false)}>
                Göster{total !== undefined ? ` (${total.toLocaleString("tr-TR")})` : ""}
              </button>
            </div>
            <div className="space-y-5 p-4">
              {panels}
              {show("themes") && themes.length > 0 && (
                <div>
                  <div className="label">Tema / alt tema</div>
                  <ThemePicker themes={themes} selected={filters.themes} onChange={setThemes} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
