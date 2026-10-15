import "server-only";
import { client } from "@/db";

export type CustomCollectionSummary = {
  id: number;
  name: string;
  description: string | null;
  coverImg: string | null;
  totalSets: number;
  ownedSets: number;
  totalFigs: number;
  ownedFigs: number;
};

/** Owned minifigure fig_nums (from owned sets + individually added figures). */
export const OWNED_FIGS_SQL = `
  SELECT fig_num, SUM(q) AS qty FROM (
    SELECT sm.fig_num, sm.quantity AS q FROM owned_sets o JOIN set_minifigs sm ON sm.set_num = o.set_num
    UNION ALL
    SELECT fig_num, quantity AS q FROM owned_minifigs
  ) GROUP BY fig_num`;

export async function listCustomCollections(): Promise<CustomCollectionSummary[]> {
  const res = await client.execute(`
    WITH owned AS (SELECT DISTINCT set_num FROM owned_sets),
         figs AS (${OWNED_FIGS_SQL})
    SELECT c.id, c.name, c.description,
           COALESCE(c.cover_img, (
             SELECT s.img_url FROM custom_collection_items i JOIN catalog_sets s ON s.set_num = i.set_num
             WHERE i.collection_id = c.id ORDER BY (i.set_num IN (SELECT set_num FROM owned)) DESC, s.num_parts DESC LIMIT 1
           )) AS cover_img,
           (SELECT COUNT(*) FROM custom_collection_items i WHERE i.collection_id = c.id AND i.set_num IS NOT NULL) AS total_sets,
           (SELECT COUNT(*) FROM custom_collection_items i WHERE i.collection_id = c.id AND i.set_num IN (SELECT set_num FROM owned)) AS owned_sets,
           (SELECT COUNT(*) FROM custom_collection_items i WHERE i.collection_id = c.id AND i.fig_num IS NOT NULL) AS total_figs,
           (SELECT COUNT(*) FROM custom_collection_items i WHERE i.collection_id = c.id AND i.fig_num IN (SELECT fig_num FROM figs)) AS owned_figs
    FROM custom_collections c ORDER BY c.name COLLATE NOCASE`);
  return res.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    description: (r.description as string) ?? null,
    coverImg: (r.cover_img as string) ?? null,
    totalSets: Number(r.total_sets),
    ownedSets: Number(r.owned_sets),
    totalFigs: Number(r.total_figs),
    ownedFigs: Number(r.owned_figs),
  }));
}
