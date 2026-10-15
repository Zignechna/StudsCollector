// Shared filter model for every collection screen. State lives in the URL.

export type SortKey = "name" | "year" | "parts" | "exit" | "added" | "number";
export type Ownership = "owned" | "notowned" | "wish";
export type StatusFilter = "available" | "retired" | "retiring";

export type SetFilters = {
  q: string;
  themes: number[];
  yearMin: number | null;
  yearMax: number | null;
  own: Ownership | null;
  status: StatusFilter | null;
  partsMin: number | null;
  partsMax: number | null;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  view: "grid" | "list";
};

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const int = (v: string | string[] | undefined) => {
  const n = Number.parseInt(first(v), 10);
  return Number.isFinite(n) ? n : null;
};

export function parseSetFilters(params: RawParams, defaults: Partial<SetFilters> = {}): SetFilters {
  const sort = first(params.sort) as SortKey;
  const own = first(params.own) as Ownership;
  const status = first(params.status) as StatusFilter;
  return {
    q: first(params.q).trim(),
    themes: first(params.themes)
      .split(",")
      .map((s) => Number.parseInt(s, 10))
      .filter(Number.isFinite),
    yearMin: int(params.yearMin),
    yearMax: int(params.yearMax),
    own: (own as string) === "all" ? null : ["owned", "notowned", "wish"].includes(own) ? own : (defaults.own ?? null),
    status: ["available", "retired", "retiring"].includes(status) ? status : null,
    partsMin: int(params.partsMin),
    partsMax: int(params.partsMax),
    sort: ["name", "year", "parts", "exit", "added", "number"].includes(sort) ? sort : (defaults.sort ?? "year"),
    dir: first(params.dir) === "asc" ? "asc" : first(params.dir) === "desc" ? "desc" : (defaults.dir ?? "desc"),
    page: Math.max(1, int(params.page) ?? 1),
    view: first(params.view) === "list" ? "list" : "grid",
  };
}

export const sortLabels: Record<SortKey, string> = {
  year: "Yıl",
  name: "İsim",
  number: "Set no",
  parts: "Parça sayısı",
  exit: "Emeklilik tarihi",
  added: "Eklenme tarihi",
};

export const ownershipLabels: Record<Ownership, string> = {
  owned: "Sahip olduklarım",
  notowned: "Eksikler",
  wish: "İstek listesi",
};

export const statusFilterLabels: Record<StatusFilter, string> = {
  available: "Piyasada",
  retiring: "Yakında emekli",
  retired: "Emekli",
};

export function countActiveFilters(f: SetFilters) {
  return [
    f.q,
    f.themes.length,
    f.yearMin,
    f.yearMax,
    f.own,
    f.status,
    f.partsMin,
    f.partsMax,
  ].filter((v) => v !== null && v !== "" && v !== 0).length;
}
