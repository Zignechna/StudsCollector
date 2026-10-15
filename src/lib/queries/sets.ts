import "server-only";
import type { InValue } from "@libsql/client";
import { client } from "@/db";
import type { SetFilters } from "@/lib/filters";
import { getThemeTree } from "./themes";

export const PAGE_SIZE = 60;

export type SetRow = {
  setNum: string;
  name: string;
  year: number | null;
  themeId: number | null;
  themeName: string | null;
  numParts: number;
  imgUrl: string | null;
  launchDate: string | null;
  exitDate: string | null;
  exitDateManual: string | null;
  ownedCount: number;
  inWishlist: boolean;
  wishPriority: number | null;
};

export type SetScope =
  | { kind: "all" }
  | { kind: "theme"; themeId: number }
  | { kind: "custom"; collectionId: number };

const EFFECTIVE_EXIT = "COALESCE(s.exit_date_manual, s.exit_date)";

export function statusSql(status: SetFilters["status"]) {
  switch (status) {
    case "retired":
      return `${EFFECTIVE_EXIT} < date('now')`;
    case "retiring":
      return `${EFFECTIVE_EXIT} >= date('now') AND ${EFFECTIVE_EXIT} <= date('now', '+183 days')`;
    case "available":
      return `(${EFFECTIVE_EXIT} >= date('now') OR (${EFFECTIVE_EXIT} IS NULL AND s.year >= CAST(strftime('%Y','now') AS INTEGER) - 1))`;
    default:
      return null;
  }
}

function orderSql(f: SetFilters) {
  const dir = f.dir === "asc" ? "ASC" : "DESC";
  switch (f.sort) {
    case "name":
      return `s.name COLLATE NOCASE ${dir}`;
    case "number":
      return `CAST(s.set_num AS INTEGER) ${dir}, s.set_num ${dir}`;
    case "parts":
      return `s.num_parts ${dir}, s.name`;
    case "exit":
      return `${EFFECTIVE_EXIT} IS NULL, ${EFFECTIVE_EXIT} ${dir}, s.name`;
    case "added":
      return `COALESCE(o.added_at, w.added_at) IS NULL, COALESCE(o.added_at, w.added_at) ${dir}, s.name`;
    default:
      return `s.year ${dir}, CAST(s.set_num AS INTEGER) ${dir}`;
  }
}

async function buildWhere(scope: SetScope, f: SetFilters) {
  const where: string[] = [];
  const args: InValue[] = [];
  const tree = await getThemeTree();

  if (scope.kind === "theme") {
    const ids = tree.subtree(scope.themeId);
    where.push(`s.theme_id IN (${ids.map(() => "?").join(",")})`);
    args.push(...ids);
  } else if (scope.kind === "custom") {
    where.push(`s.set_num IN (SELECT set_num FROM custom_collection_items WHERE collection_id = ? AND set_num IS NOT NULL)`);
    args.push(scope.collectionId);
  }
  if (f.themes.length) {
    const ids = [...new Set(f.themes.flatMap((t) => tree.subtree(t)))];
    if (ids.length) {
      where.push(`s.theme_id IN (${ids.map(() => "?").join(",")})`);
      args.push(...ids);
    }
  }
  if (f.q) {
    where.push(`(s.name LIKE ? OR s.set_num LIKE ?)`);
    args.push(`%${f.q}%`, `${f.q}%`);
  }
  if (f.yearMin != null) {
    where.push("s.year >= ?");
    args.push(f.yearMin);
  }
  if (f.yearMax != null) {
    where.push("s.year <= ?");
    args.push(f.yearMax);
  }
  if (f.partsMin != null) {
    where.push("s.num_parts >= ?");
    args.push(f.partsMin);
  }
  if (f.partsMax != null) {
    where.push("s.num_parts <= ?");
    args.push(f.partsMax);
  }
  if (f.own === "owned") where.push("o.set_num IS NOT NULL");
  if (f.own === "notowned") where.push("o.set_num IS NULL");
  if (f.own === "wish") where.push("w.set_num IS NOT NULL");
  const st = statusSql(f.status);
  if (st) where.push(st);

  return { where: where.length ? `WHERE ${where.join(" AND ")}` : "", args };
}

const FROM = `
  FROM catalog_sets s
  LEFT JOIN (SELECT set_num, COUNT(*) AS cnt, MAX(created_at) AS added_at FROM owned_sets GROUP BY set_num) o
    ON o.set_num = s.set_num
  LEFT JOIN wishlist w ON w.set_num = s.set_num
  LEFT JOIN catalog_themes t ON t.id = s.theme_id`;

const SELECT = `
  SELECT s.set_num, s.name, s.year, s.theme_id, t.name AS theme_name, s.num_parts, s.img_url,
         s.launch_date, s.exit_date, s.exit_date_manual,
         COALESCE(o.cnt, 0) AS owned_count, w.set_num IS NOT NULL AS in_wishlist, w.priority AS wish_priority`;

export function mapSetRow(r: Record<string, unknown>): SetRow {
  return {
    setNum: String(r.set_num),
    name: String(r.name),
    year: r.year == null ? null : Number(r.year),
    themeId: r.theme_id == null ? null : Number(r.theme_id),
    themeName: r.theme_name == null ? null : String(r.theme_name),
    numParts: Number(r.num_parts ?? 0),
    imgUrl: (r.img_url as string) ?? null,
    launchDate: (r.launch_date as string) ?? null,
    exitDate: (r.exit_date as string) ?? null,
    exitDateManual: (r.exit_date_manual as string) ?? null,
    ownedCount: Number(r.owned_count ?? 0),
    inWishlist: Boolean(Number(r.in_wishlist ?? 0)),
    wishPriority: r.wish_priority == null ? null : Number(r.wish_priority),
  };
}

export async function listSets(scope: SetScope, f: SetFilters, pageSize = PAGE_SIZE) {
  const { where, args } = await buildWhere(scope, f);
  const offset = (f.page - 1) * pageSize;
  const [rows, count] = await Promise.all([
    client.execute({
      sql: `${SELECT} ${FROM} ${where} ORDER BY ${orderSql(f)} LIMIT ? OFFSET ?`,
      args: [...args, pageSize, offset],
    }),
    client.execute({
      sql: `SELECT COUNT(*) AS n, SUM(CASE WHEN o.set_num IS NOT NULL THEN 1 ELSE 0 END) AS owned ${FROM} ${where}`,
      args,
    }),
  ]);
  return {
    sets: rows.rows.map((r) => mapSetRow(r as Record<string, unknown>)),
    total: Number(count.rows[0]?.n ?? 0),
    ownedInResult: Number(count.rows[0]?.owned ?? 0),
    pageSize,
  };
}

/** Progress for a scope without any filters applied ("3 / 4 toplandı"). */
export async function scopeProgress(scope: SetScope) {
  const { where, args } = await buildWhere(scope, {
    q: "",
    themes: [],
    yearMin: null,
    yearMax: null,
    own: null,
    status: null,
    partsMin: null,
    partsMax: null,
    sort: "year",
    dir: "desc",
    page: 1,
    view: "grid",
  });
  const res = await client.execute({
    sql: `SELECT COUNT(*) AS total,
                 SUM(CASE WHEN o.set_num IS NOT NULL THEN 1 ELSE 0 END) AS owned,
                 SUM(CASE WHEN w.set_num IS NOT NULL THEN 1 ELSE 0 END) AS wished,
                 MIN(s.year) AS year_min, MAX(s.year) AS year_max
          ${FROM} ${where}`,
    args,
  });
  const r = res.rows[0];
  return {
    total: Number(r?.total ?? 0),
    owned: Number(r?.owned ?? 0),
    wished: Number(r?.wished ?? 0),
    yearMin: r?.year_min == null ? null : Number(r.year_min),
    yearMax: r?.year_max == null ? null : Number(r.year_max),
  };
}

export async function getSet(setNum: string): Promise<SetRow | null> {
  const res = await client.execute({ sql: `${SELECT} ${FROM} WHERE s.set_num = ?`, args: [setNum] });
  return res.rows[0] ? mapSetRow(res.rows[0] as Record<string, unknown>) : null;
}

export async function getSetsByNums(nums: string[]): Promise<SetRow[]> {
  if (!nums.length) return [];
  const res = await client.execute({
    sql: `${SELECT} ${FROM} WHERE s.set_num IN (${nums.map(() => "?").join(",")})`,
    args: nums,
  });
  return res.rows.map((r) => mapSetRow(r as Record<string, unknown>));
}

/** Quick catalog search for the add-set screen and pickers. */
export async function searchCatalog(q: string, limit = 24): Promise<SetRow[]> {
  const term = q.trim();
  if (!term) return [];
  const res = await client.execute({
    sql: `${SELECT} ${FROM}
          WHERE s.set_num = ? OR s.set_num LIKE ? OR s.name LIKE ?
          ORDER BY (s.set_num = ?) DESC, (s.set_num LIKE ?) DESC, s.year DESC
          LIMIT ?`,
    args: [term, `${term}-%`, `%${term}%`, term.includes("-") ? term : `${term}-1`, `${term}%`, limit],
  });
  return res.rows.map((r) => mapSetRow(r as Record<string, unknown>));
}
