import "server-only";
import type { InValue } from "@libsql/client";
import { client } from "@/db";
import { OWNED_FIGS_SQL } from "./collections";

export const CMF_THEME_ID = 535;
export const FIG_PAGE_SIZE = 72;

export type FigRow = {
  figNum: string;
  name: string;
  imgUrl: string | null;
  numParts: number;
  ownedQty: number;
  looseQty: number;
  fromSets: number;
};

const FIG_SELECT = `
  SELECT f.fig_num, f.name, f.img_url, f.num_parts,
         COALESCE(o.qty, 0) AS owned_qty,
         COALESCE((SELECT quantity FROM owned_minifigs om WHERE om.fig_num = f.fig_num), 0) AS loose_qty,
         (SELECT COUNT(DISTINCT sm.set_num) FROM set_minifigs sm JOIN owned_sets os ON os.set_num = sm.set_num WHERE sm.fig_num = f.fig_num) AS from_sets
  FROM catalog_minifigs f
  LEFT JOIN (${OWNED_FIGS_SQL}) o ON o.fig_num = f.fig_num`;

function mapFig(r: Record<string, unknown>): FigRow {
  return {
    figNum: String(r.fig_num),
    name: String(r.name),
    imgUrl: (r.img_url as string) ?? null,
    numParts: Number(r.num_parts ?? 0),
    ownedQty: Number(r.owned_qty ?? 0),
    looseQty: Number(r.loose_qty ?? 0),
    fromSets: Number(r.from_sets ?? 0),
  };
}

export type FigQuery = {
  scope: { kind: "owned" } | { kind: "themes"; themeIds: number[] };
  q: string;
  own: "owned" | "notowned" | null;
  sort: "name" | "number" | "owned";
  page: number;
};

export async function listFigs(f: FigQuery) {
  const where: string[] = [];
  const args: InValue[] = [];
  if (f.scope.kind === "owned") where.push("o.qty > 0");
  else {
    where.push(
      `f.fig_num IN (SELECT sm.fig_num FROM set_minifigs sm JOIN catalog_sets s ON s.set_num = sm.set_num WHERE s.theme_id IN (${f.scope.themeIds.map(() => "?").join(",")}))`,
    );
    args.push(...f.scope.themeIds);
  }
  if (f.q) {
    where.push("(f.name LIKE ? OR f.fig_num LIKE ?)");
    args.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.own === "owned") where.push("o.qty > 0");
  if (f.own === "notowned") where.push("o.qty IS NULL");
  const w = `WHERE ${where.join(" AND ")}`;
  const order = f.sort === "number" ? "f.fig_num" : f.sort === "owned" ? "owned_qty DESC, f.name" : "f.name COLLATE NOCASE";
  const [rows, count] = await Promise.all([
    client.execute({ sql: `${FIG_SELECT} ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, args: [...args, FIG_PAGE_SIZE, (f.page - 1) * FIG_PAGE_SIZE] }),
    client.execute({
      sql: `SELECT COUNT(*) AS n, SUM(CASE WHEN o.qty > 0 THEN 1 ELSE 0 END) AS owned FROM catalog_minifigs f LEFT JOIN (${OWNED_FIGS_SQL}) o ON o.fig_num = f.fig_num ${w}`,
      args,
    }),
  ]);
  return {
    figs: rows.rows.map((r) => mapFig(r as Record<string, unknown>)),
    total: Number(count.rows[0]?.n ?? 0),
    owned: Number(count.rows[0]?.owned ?? 0),
  };
}

/** Progress per theme (counted in distinct figures) for a list of theme subtrees. */
export async function figProgressForThemes(groups: { id: number; themeIds: number[] }[]) {
  if (!groups.length) return new Map<number, { total: number; owned: number; cover: string | null }>();
  const res = await client.execute(`
    WITH owned AS (${OWNED_FIGS_SQL})
    SELECT s.theme_id, sm.fig_num, f.img_url, owned.qty IS NOT NULL AS is_owned
    FROM set_minifigs sm
    JOIN catalog_sets s ON s.set_num = sm.set_num
    LEFT JOIN catalog_minifigs f ON f.fig_num = sm.fig_num
    LEFT JOIN owned ON owned.fig_num = sm.fig_num
    WHERE s.theme_id IN (${[...new Set(groups.flatMap((g) => g.themeIds))].join(",") || "NULL"})`);
  const byTheme = new Map<number, { fig: string; img: string | null; owned: boolean }[]>();
  for (const r of res.rows) {
    const t = Number(r.theme_id);
    if (!byTheme.has(t)) byTheme.set(t, []);
    byTheme.get(t)!.push({ fig: String(r.fig_num), img: (r.img_url as string) ?? null, owned: Boolean(Number(r.is_owned)) });
  }
  const out = new Map<number, { total: number; owned: number; cover: string | null }>();
  for (const g of groups) {
    const figs = new Map<string, { img: string | null; owned: boolean }>();
    for (const t of g.themeIds) for (const x of byTheme.get(t) ?? []) figs.set(x.fig, x);
    const vals = [...figs.values()];
    out.set(g.id, {
      total: vals.length,
      owned: vals.filter((v) => v.owned).length,
      cover: vals.find((v) => v.owned && v.img)?.img ?? vals.find((v) => v.img)?.img ?? null,
    });
  }
  return out;
}

export async function searchMinifigs(q: string, limit = 20) {
  const res = await client.execute({
    sql: `${FIG_SELECT} WHERE f.name LIKE ? OR f.fig_num LIKE ? ORDER BY f.name LIMIT ?`,
    args: [`%${q}%`, `%${q}%`, limit],
  });
  return res.rows.map((r) => mapFig(r as Record<string, unknown>));
}
