import "server-only";
import type { InValue } from "@libsql/client";
import { client } from "@/db";
import { expandImg } from "@/lib/images";

export type PoolKind = "total" | "surplus";

/**
 * Total pool   = all parts of owned sets (spares included) − missing parts + loose parts
 * Surplus pool = spare parts of owned sets + leftovers of the chosen build mode + loose parts
 * Each owned copy counts separately.
 */
export function poolSql(kind: PoolKind) {
  if (kind === "total") {
    return `
      SELECT part_num, color_id, SUM(q) AS qty FROM (
        SELECT si.part_num, si.color_id, si.quantity AS q
          FROM owned_sets o JOIN set_inventory si ON si.set_num = o.set_num
        UNION ALL
        SELECT part_num, color_id, -quantity FROM missing_parts
        UNION ALL
        SELECT part_num, color_id, quantity FROM loose_parts
      ) GROUP BY part_num, color_id HAVING SUM(q) > 0`;
  }
  return `
    SELECT part_num, color_id, SUM(q) AS qty FROM (
      SELECT si.part_num, si.color_id, si.quantity AS q
        FROM owned_sets o JOIN set_inventory si ON si.set_num = o.set_num AND si.is_spare = 1
      UNION ALL
      SELECT l.part_num, l.color_id, l.quantity
        FROM owned_sets o JOIN build_mode_leftovers l ON l.build_mode_id = o.build_mode_id
      UNION ALL
      SELECT part_num, color_id, quantity FROM loose_parts
    ) GROUP BY part_num, color_id HAVING SUM(q) > 0`;
}

export async function getPoolMap(kind: PoolKind): Promise<Map<string, number>> {
  const res = await client.execute(poolSql(kind));
  const map = new Map<string, number>();
  for (const r of res.rows) map.set(`${r.part_num}|${r.color_id}`, Number(r.qty));
  return map;
}

export type PoolRow = {
  partNum: string;
  colorId: number;
  qty: number;
  partName: string;
  colorName: string;
  rgb: string;
  isTrans: boolean;
  category: string | null;
  imgUrl: string | null;
};

export type PoolFilters = { q: string; color: number | null; category: number | null; sort: "qty" | "name" | "color"; page: number };

export const POOL_PAGE_SIZE = 96;

export async function listPool(kind: PoolKind, f: PoolFilters) {
  const where: string[] = [];
  const args: InValue[] = [];
  if (f.q) {
    where.push("(pool.part_num LIKE ? OR p.name LIKE ?)");
    args.push(`${f.q}%`, `%${f.q}%`);
  }
  if (f.color != null) {
    where.push("pool.color_id = ?");
    args.push(f.color);
  }
  if (f.category != null) {
    where.push("p.part_cat_id = ?");
    args.push(f.category);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order =
    f.sort === "name" ? "p.name COLLATE NOCASE, c.name" : f.sort === "color" ? "c.name, p.name" : "pool.qty DESC, p.name";
  const from = `FROM (${poolSql(kind)}) pool
    LEFT JOIN catalog_parts p ON p.part_num = pool.part_num
    LEFT JOIN catalog_colors c ON c.id = pool.color_id
    LEFT JOIN catalog_part_categories pc ON pc.id = p.part_cat_id
    LEFT JOIN part_images img ON img.part_num = pool.part_num AND img.color_id = pool.color_id`;
  const [rows, totals] = await Promise.all([
    client.execute({
      sql: `SELECT pool.part_num, pool.color_id, pool.qty, COALESCE(p.name, pool.part_num) AS part_name,
                   COALESCE(c.name, '?') AS color_name, COALESCE(c.rgb, 'CCCCCC') AS rgb, COALESCE(c.is_trans, 0) AS is_trans,
                   pc.name AS category, img.img_url
            ${from} ${w} ORDER BY ${order} LIMIT ? OFFSET ?`,
      args: [...args, POOL_PAGE_SIZE, (f.page - 1) * POOL_PAGE_SIZE],
    }),
    client.execute({ sql: `SELECT COUNT(*) AS lots, COALESCE(SUM(pool.qty),0) AS pieces ${from} ${w}`, args }),
  ]);
  return {
    rows: rows.rows.map(
      (r): PoolRow => ({
        partNum: String(r.part_num),
        colorId: Number(r.color_id),
        qty: Number(r.qty),
        partName: String(r.part_name),
        colorName: String(r.color_name),
        rgb: String(r.rgb),
        isTrans: Boolean(Number(r.is_trans)),
        category: (r.category as string) ?? null,
        imgUrl: expandImg(r.img_url as string | null),
      }),
    ),
    lots: Number(totals.rows[0]?.lots ?? 0),
    pieces: Number(totals.rows[0]?.pieces ?? 0),
  };
}

/** Colors and categories present in a pool, for filter dropdowns. */
export async function poolFacets(kind: PoolKind) {
  const [colors, cats] = await Promise.all([
    client.execute(`SELECT c.id, c.name, c.rgb, SUM(pool.qty) AS n FROM (${poolSql(kind)}) pool JOIN catalog_colors c ON c.id = pool.color_id GROUP BY c.id ORDER BY c.name`),
    client.execute(
      `SELECT pc.id, pc.name, SUM(pool.qty) AS n FROM (${poolSql(kind)}) pool JOIN catalog_parts p ON p.part_num = pool.part_num JOIN catalog_part_categories pc ON pc.id = p.part_cat_id GROUP BY pc.id ORDER BY pc.name`,
    ),
  ]);
  return {
    colors: colors.rows.map((r) => ({ id: Number(r.id), name: String(r.name), rgb: String(r.rgb), n: Number(r.n) })),
    categories: cats.rows.map((r) => ({ id: Number(r.id), name: String(r.name), n: Number(r.n) })),
  };
}

export type Buildability = {
  required: number;
  have: number;
  percent: number;
  missing: { partNum: string; colorId: number; need: number; have: number; partName: string; colorName: string; rgb: string; imgUrl: string | null }[];
};

/** Compares a MOC / alternate build inventory with a pool. */
export async function buildability(mocNum: string, pool: Map<string, number>): Promise<Buildability | null> {
  const res = await client.execute({
    sql: `SELECT m.part_num, m.color_id, m.quantity, COALESCE(p.name, m.part_num) AS part_name,
                 COALESCE(c.name, '?') AS color_name, COALESCE(c.rgb, 'CCCCCC') AS rgb, img.img_url
          FROM moc_inventory m
          LEFT JOIN catalog_parts p ON p.part_num = m.part_num
          LEFT JOIN catalog_colors c ON c.id = m.color_id
          LEFT JOIN part_images img ON img.part_num = m.part_num AND img.color_id = m.color_id
          WHERE m.moc_num = ?`,
    args: [mocNum],
  });
  if (!res.rows.length) return null;
  let required = 0;
  let have = 0;
  const missing: Buildability["missing"] = [];
  for (const r of res.rows) {
    const need = Number(r.quantity);
    const got = pool.get(`${r.part_num}|${r.color_id}`) ?? 0;
    required += need;
    have += Math.min(need, got);
    if (got < need) {
      missing.push({
        partNum: String(r.part_num),
        colorId: Number(r.color_id),
        need,
        have: got,
        partName: String(r.part_name),
        colorName: String(r.color_name),
        rgb: String(r.rgb),
        imgUrl: expandImg(r.img_url as string | null),
      });
    }
  }
  missing.sort((a, b) => b.need - b.have - (a.need - a.have));
  return { required, have, percent: required ? Math.floor((have / required) * 100) : 0, missing };
}
