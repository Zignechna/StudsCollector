/**
 * Rebrickable API v3 client with a database cache. Server-side only.
 * Everything fetched here is written to the database so the same data is never requested twice.
 */
import type { InStatement, InValue } from "@libsql/client";
import { client } from "@/db";
import { compactImg } from "./images";

const BASE = "https://rebrickable.com/api/v3";
let lastCall = 0;

export class RebrickableError extends Error {}

export function hasRebrickableKey() {
  return Boolean(process.env.REBRICKABLE_API_KEY);
}

async function rbFetch<T>(path: string, attempt = 0): Promise<T> {
  const key = process.env.REBRICKABLE_API_KEY;
  if (!key) throw new RebrickableError("Rebrickable API anahtarı tanımlı değil (REBRICKABLE_API_KEY).");
  // ~1 request per second
  const wait = lastCall + 1050 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(path.startsWith("http") ? path : BASE + path, {
    headers: { Authorization: `key ${key}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 429 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    return rbFetch<T>(path, attempt + 1);
  }
  if (res.status === 404) throw new RebrickableError("Rebrickable'da bulunamadı.");
  if (!res.ok) throw new RebrickableError(`Rebrickable hatası (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

type Page<T> = { count: number; next: string | null; results: T[] };

async function rbFetchAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = `${path}${path.includes("?") ? "&" : "?"}page_size=1000`;
  while (url) {
    const page: Page<T> = await rbFetch<Page<T>>(url);
    out.push(...page.results);
    url = page.next;
  }
  return out;
}

type ApiSet = {
  set_num: string;
  name: string;
  year: number;
  theme_id: number;
  num_parts: number;
  set_img_url: string | null;
};

type ApiInventoryPart = {
  part: { part_num: string; name: string; part_cat_id: number; part_img_url: string | null };
  color: { id: number; name: string; rgb: string; is_trans: boolean };
  quantity: number;
  is_spare: boolean;
};

function rows(table: string, columns: string[], values: InValue[][], conflict = "DO NOTHING"): InStatement[] {
  const per = Math.max(1, Math.floor(2000 / columns.length));
  const out: InStatement[] = [];
  for (let i = 0; i < values.length; i += per) {
    const chunk = values.slice(i, i + per);
    out.push({
      sql: `INSERT INTO ${table} (${columns.join(",")}) VALUES ${chunk
        .map(() => `(${columns.map(() => "?").join(",")})`)
        .join(",")} ON CONFLICT ${conflict}`,
      args: chunk.flat(),
    });
  }
  return out;
}

/** Makes sure a set exists in catalog_sets (fetching from the API when the CSV import does not have it yet). */
export async function ensureCatalogSet(setNum: string): Promise<boolean> {
  const existing = await client.execute({ sql: "SELECT 1 FROM catalog_sets WHERE set_num = ?", args: [setNum] });
  if (existing.rows.length) return true;
  if (!hasRebrickableKey()) return false;
  try {
    const s = await rbFetch<ApiSet>(`/lego/sets/${encodeURIComponent(setNum)}/`);
    await client.execute({
      sql: `INSERT INTO catalog_sets (set_num, name, year, theme_id, num_parts, img_url)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      args: [s.set_num, s.name, s.year, s.theme_id, s.num_parts, s.set_img_url],
    });
    return true;
  } catch (err) {
    if (err instanceof RebrickableError) return false;
    throw err;
  }
}

/** Searches Rebrickable directly (used when the local catalog has no match). */
export async function searchRemoteSets(q: string): Promise<ApiSet[]> {
  if (!hasRebrickableKey()) return [];
  const page = await rbFetch<Page<ApiSet>>(`/lego/sets/?search=${encodeURIComponent(q)}&page_size=20`);
  return page.results;
}

/**
 * Makes sure the set's part inventory and minifigure list are cached.
 * Returns the inventory status after the call.
 */
export async function ensureInventory(setNum: string): Promise<"csv" | "api" | "none"> {
  const res = await client.execute({ sql: "SELECT inventory_status FROM catalog_sets WHERE set_num = ?", args: [setNum] });
  const status = String(res.rows[0]?.inventory_status ?? "none") as "csv" | "api" | "none";
  if (status !== "none" || !hasRebrickableKey()) return status;

  const parts = await rbFetchAll<ApiInventoryPart>(`/lego/sets/${encodeURIComponent(setNum)}/parts/`);
  const figs = await rbFetchAll<{ set_num: string; set_name: string; quantity: number; set_img_url: string | null; num_parts?: number }>(
    `/lego/sets/${encodeURIComponent(setNum)}/minifigs/`,
  );

  const inv = new Map<string, InValue[]>();
  for (const p of parts) {
    const key = `${p.part.part_num}|${p.color.id}|${p.is_spare ? 1 : 0}`;
    const cur = inv.get(key);
    if (cur) cur[4] = Number(cur[4]) + p.quantity;
    else inv.set(key, [setNum, p.part.part_num, p.color.id, p.is_spare ? 1 : 0, p.quantity]);
  }
  const statements: InStatement[] = [
    { sql: "DELETE FROM set_inventory WHERE set_num = ?", args: [setNum] },
    ...rows(
      "catalog_parts",
      ["part_num", "name", "part_cat_id"],
      parts.map((p) => [p.part.part_num, p.part.name, p.part.part_cat_id]),
    ),
    ...rows(
      "catalog_colors",
      ["id", "name", "rgb", "is_trans"],
      parts.map((p) => [p.color.id, p.color.name, p.color.rgb, p.color.is_trans ? 1 : 0]),
    ),
    ...rows(
      "part_images",
      ["part_num", "color_id", "img_url"],
      parts.filter((p) => p.part.part_img_url).map((p) => [p.part.part_num, p.color.id, compactImg(p.part.part_img_url)]),
    ),
    ...rows("set_inventory", ["set_num", "part_num", "color_id", "is_spare", "quantity"], [...inv.values()]),
    ...rows(
      "catalog_minifigs",
      ["fig_num", "name", "num_parts", "img_url"],
      figs.map((f) => [f.set_num, f.set_name, f.num_parts ?? 0, f.set_img_url]),
    ),
    ...rows(
      "set_minifigs",
      ["set_num", "fig_num", "quantity"],
      figs.map((f) => [setNum, f.set_num, f.quantity]),
      "(set_num, fig_num) DO UPDATE SET quantity = excluded.quantity",
    ),
    { sql: "UPDATE catalog_sets SET inventory_status = 'api' WHERE set_num = ?", args: [setNum] },
  ];
  await client.batch(statements, "write");
  return "api";
}

type ApiMoc = {
  set_num: string;
  name: string;
  year: number;
  num_parts: number;
  moc_img_url: string | null;
  moc_url: string | null;
  designer_name: string | null;
};

/** Cached list of alternate builds / MOCs that can be built from a set. */
export async function ensureAlternates(setNum: string, force = false): Promise<boolean> {
  const res = await client.execute({ sql: "SELECT alternates_fetched_at FROM catalog_sets WHERE set_num = ?", args: [setNum] });
  if (res.rows[0]?.alternates_fetched_at && !force) return true;
  if (!hasRebrickableKey()) return false;
  const mocs = await rbFetchAll<ApiMoc>(`/lego/sets/${encodeURIComponent(setNum)}/alternates/`);
  await client.batch(
    [
      ...rows(
        "catalog_mocs",
        ["moc_num", "name", "year", "num_parts", "img_url", "designer", "moc_url"],
        mocs.map((m) => [m.set_num, m.name, m.year, m.num_parts, m.moc_img_url, m.designer_name, m.moc_url]),
        "(moc_num) DO UPDATE SET name=excluded.name, num_parts=excluded.num_parts, img_url=excluded.img_url",
      ),
      ...rows("set_alternates", ["set_num", "moc_num"], mocs.map((m) => [setNum, m.set_num])),
      { sql: "UPDATE catalog_sets SET alternates_fetched_at = unixepoch() WHERE set_num = ?", args: [setNum] },
    ],
    "write",
  );
  return true;
}

/** Cached inventory of a MOC (or an alternate build). */
export async function ensureMocInventory(mocNum: string): Promise<boolean> {
  const res = await client.execute({ sql: "SELECT inventory_fetched_at FROM catalog_mocs WHERE moc_num = ?", args: [mocNum] });
  if (res.rows[0]?.inventory_fetched_at) return true;
  if (!hasRebrickableKey()) return false;
  // Official alternate builds (e.g. 31120-2) are sets; fan MOCs use the /mocs/ endpoint.
  const isMoc = mocNum.toUpperCase().startsWith("MOC-");
  const parts = await rbFetchAll<ApiInventoryPart>(
    `/lego/${isMoc ? "mocs" : "sets"}/${encodeURIComponent(mocNum)}/parts/`,
  );
  const inv = new Map<string, InValue[]>();
  for (const p of parts) {
    if (p.is_spare) continue;
    const key = `${p.part.part_num}|${p.color.id}`;
    const cur = inv.get(key);
    if (cur) cur[3] = Number(cur[3]) + p.quantity;
    else inv.set(key, [mocNum, p.part.part_num, p.color.id, p.quantity]);
  }
  await client.batch(
    [
      { sql: "DELETE FROM moc_inventory WHERE moc_num = ?", args: [mocNum] },
      ...rows("catalog_parts", ["part_num", "name", "part_cat_id"], parts.map((p) => [p.part.part_num, p.part.name, p.part.part_cat_id])),
      ...rows(
        "catalog_colors",
        ["id", "name", "rgb", "is_trans"],
        parts.map((p) => [p.color.id, p.color.name, p.color.rgb, p.color.is_trans ? 1 : 0]),
      ),
      ...rows(
        "part_images",
        ["part_num", "color_id", "img_url"],
        parts.filter((p) => p.part.part_img_url).map((p) => [p.part.part_num, p.color.id, compactImg(p.part.part_img_url)]),
      ),
      ...rows("moc_inventory", ["moc_num", "part_num", "color_id", "quantity"], [...inv.values()]),
      { sql: "UPDATE catalog_mocs SET inventory_fetched_at = unixepoch() WHERE moc_num = ?", args: [mocNum] },
    ],
    "write",
  );
  return true;
}

/** Fetches a single MOC's metadata (for MOCs entered by number). */
export async function ensureMoc(mocNum: string): Promise<boolean> {
  const res = await client.execute({ sql: "SELECT 1 FROM catalog_mocs WHERE moc_num = ?", args: [mocNum] });
  if (res.rows.length) return true;
  if (!hasRebrickableKey()) return false;
  const isMoc = mocNum.toUpperCase().startsWith("MOC-");
  try {
    if (isMoc) {
      const m = await rbFetch<ApiMoc>(`/lego/mocs/${encodeURIComponent(mocNum)}/`);
      await client.execute({
        sql: `INSERT INTO catalog_mocs (moc_num, name, year, num_parts, img_url, designer, moc_url) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,
        args: [m.set_num, m.name, m.year, m.num_parts, m.moc_img_url, m.designer_name, m.moc_url],
      });
    } else {
      const s = await rbFetch<ApiSet>(`/lego/sets/${encodeURIComponent(mocNum)}/`);
      await client.execute({
        sql: `INSERT INTO catalog_mocs (moc_num, name, year, num_parts, img_url) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING`,
        args: [s.set_num, s.name, s.year, s.num_parts, s.set_img_url],
      });
    }
    return true;
  } catch (err) {
    if (err instanceof RebrickableError) return false;
    throw err;
  }
}
