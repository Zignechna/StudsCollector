import "server-only";
import { client } from "@/db";
import { expandImg } from "@/lib/images";

export type InventoryRow = {
  partNum: string;
  colorId: number;
  isSpare: boolean;
  quantity: number;
  partName: string;
  colorName: string;
  rgb: string;
  isTrans: boolean;
  imgUrl: string | null;
  category: string | null;
};

export type OwnedCopy = {
  id: number;
  status: string;
  acquiredAt: string | null;
  buildModeId: number | null;
  notes: string | null;
  createdAt: number;
  missingCount: number;
};

export type BuildMode = { id: number; name: string; leftovers: { partNum: string; colorId: number; quantity: number }[] };

export async function getInventory(setNum: string): Promise<InventoryRow[]> {
  const res = await client.execute({
    sql: `SELECT i.part_num, i.color_id, i.is_spare, i.quantity,
                 COALESCE(p.name, i.part_num) AS part_name, COALESCE(c.name, '?') AS color_name,
                 COALESCE(c.rgb, 'CCCCCC') AS rgb, COALESCE(c.is_trans, 0) AS is_trans,
                 img.img_url, pc.name AS category
          FROM set_inventory i
          LEFT JOIN catalog_parts p ON p.part_num = i.part_num
          LEFT JOIN catalog_colors c ON c.id = i.color_id
          LEFT JOIN part_images img ON img.part_num = i.part_num AND img.color_id = i.color_id
          LEFT JOIN catalog_part_categories pc ON pc.id = p.part_cat_id
          WHERE i.set_num = ?
          ORDER BY i.is_spare, pc.name, p.name, c.name`,
    args: [setNum],
  });
  return res.rows.map((r) => ({
    partNum: String(r.part_num),
    colorId: Number(r.color_id),
    isSpare: Boolean(Number(r.is_spare)),
    quantity: Number(r.quantity),
    partName: String(r.part_name),
    colorName: String(r.color_name),
    rgb: String(r.rgb),
    isTrans: Boolean(Number(r.is_trans)),
    imgUrl: expandImg(r.img_url as string | null),
    category: (r.category as string) ?? null,
  }));
}

export async function getOwnedCopies(setNum: string): Promise<OwnedCopy[]> {
  const res = await client.execute({
    sql: `SELECT o.*, (SELECT COALESCE(SUM(quantity),0) FROM missing_parts m WHERE m.owned_set_id = o.id) AS missing_count
          FROM owned_sets o WHERE o.set_num = ? ORDER BY o.id`,
    args: [setNum],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    status: String(r.status),
    acquiredAt: (r.acquired_at as string) ?? null,
    buildModeId: r.build_mode_id == null ? null : Number(r.build_mode_id),
    notes: (r.notes as string) ?? null,
    createdAt: Number(r.created_at),
    missingCount: Number(r.missing_count),
  }));
}

export async function getMissingMap(setNum: string): Promise<Record<number, Record<string, number>>> {
  const res = await client.execute({
    sql: `SELECT m.owned_set_id, m.part_num, m.color_id, m.quantity FROM missing_parts m
          JOIN owned_sets o ON o.id = m.owned_set_id WHERE o.set_num = ?`,
    args: [setNum],
  });
  const out: Record<number, Record<string, number>> = {};
  for (const r of res.rows) {
    const id = Number(r.owned_set_id);
    (out[id] ??= {})[`${r.part_num}|${r.color_id}`] = Number(r.quantity);
  }
  return out;
}

export async function getBuildModes(setNum: string): Promise<BuildMode[]> {
  const res = await client.execute({
    sql: `SELECT b.id, b.name, l.part_num, l.color_id, l.quantity
          FROM build_modes b LEFT JOIN build_mode_leftovers l ON l.build_mode_id = b.id
          WHERE b.set_num = ? ORDER BY b.id`,
    args: [setNum],
  });
  const map = new Map<number, BuildMode>();
  for (const r of res.rows) {
    const id = Number(r.id);
    let m = map.get(id);
    if (!m) map.set(id, (m = { id, name: String(r.name), leftovers: [] }));
    if (r.part_num) m.leftovers.push({ partNum: String(r.part_num), colorId: Number(r.color_id), quantity: Number(r.quantity) });
  }
  return [...map.values()];
}

export type SetMinifig = { figNum: string; name: string; imgUrl: string | null; quantity: number; ownedQty: number };

export async function getSetMinifigs(setNum: string): Promise<SetMinifig[]> {
  const res = await client.execute({
    sql: `WITH figs AS (
            SELECT fig_num, SUM(q) AS qty FROM (
              SELECT sm.fig_num, sm.quantity AS q FROM owned_sets o JOIN set_minifigs sm ON sm.set_num = o.set_num
              UNION ALL SELECT fig_num, quantity FROM owned_minifigs) GROUP BY fig_num)
          SELECT sm.fig_num, COALESCE(f.name, sm.fig_num) AS name, f.img_url, sm.quantity, COALESCE(figs.qty, 0) AS owned_qty
          FROM set_minifigs sm
          LEFT JOIN catalog_minifigs f ON f.fig_num = sm.fig_num
          LEFT JOIN figs ON figs.fig_num = sm.fig_num
          WHERE sm.set_num = ? ORDER BY f.name`,
    args: [setNum],
  });
  return res.rows.map((r) => ({
    figNum: String(r.fig_num),
    name: String(r.name),
    imgUrl: (r.img_url as string) ?? null,
    quantity: Number(r.quantity),
    ownedQty: Number(r.owned_qty),
  }));
}

export async function getCollectionMembership(setNum: string) {
  const res = await client.execute({
    sql: `SELECT c.id, c.name, EXISTS(SELECT 1 FROM custom_collection_items i WHERE i.collection_id = c.id AND i.set_num = ?) AS member
          FROM custom_collections c ORDER BY c.name COLLATE NOCASE`,
    args: [setNum],
  });
  return res.rows.map((r) => ({ id: Number(r.id), name: String(r.name), member: Boolean(Number(r.member)) }));
}

export async function getSetExtra(setNum: string) {
  const res = await client.execute({
    sql: `SELECT subtheme, inventory_status, brickset_checked_at, alternates_fetched_at FROM catalog_sets WHERE set_num = ?`,
    args: [setNum],
  });
  const r = res.rows[0];
  return {
    subtheme: (r?.subtheme as string) ?? null,
    inventoryStatus: String(r?.inventory_status ?? "none"),
    bricksetCheckedAt: r?.brickset_checked_at == null ? null : Number(r.brickset_checked_at),
    alternatesFetchedAt: r?.alternates_fetched_at == null ? null : Number(r.alternates_fetched_at),
  };
}
