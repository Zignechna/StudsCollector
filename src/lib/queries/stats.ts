import "server-only";
import { client } from "@/db";
import { mapSetRow, type SetRow } from "./sets";

export async function getDashboardStats() {
  const res = await client.execute(`
    SELECT
      (SELECT COUNT(*) FROM owned_sets) AS copies,
      (SELECT COUNT(DISTINCT set_num) FROM owned_sets) AS distinct_sets,
      (SELECT COALESCE(SUM(s.num_parts), 0) FROM owned_sets o JOIN catalog_sets s ON s.set_num = o.set_num) AS parts,
      (SELECT COALESCE(SUM(sm.quantity), 0) FROM owned_sets o JOIN set_minifigs sm ON sm.set_num = o.set_num)
        + (SELECT COALESCE(SUM(quantity), 0) FROM owned_minifigs) AS minifigs,
      (SELECT COUNT(*) FROM wishlist) AS wishlist,
      (SELECT COALESCE(SUM(quantity), 0) FROM missing_parts) AS missing,
      (SELECT COUNT(*) FROM catalog_sets) AS catalog_sets
  `);
  const r = res.rows[0];
  return {
    copies: Number(r.copies),
    distinctSets: Number(r.distinct_sets),
    parts: Number(r.parts),
    minifigs: Number(r.minifigs),
    wishlist: Number(r.wishlist),
    missing: Number(r.missing),
    catalogSets: Number(r.catalog_sets),
  };
}

const SET_SELECT = `
  SELECT s.set_num, s.name, s.year, s.theme_id, t.name AS theme_name, s.num_parts, s.img_url,
         s.launch_date, s.exit_date, s.exit_date_manual,
         COALESCE(o.cnt, 0) AS owned_count, w.set_num IS NOT NULL AS in_wishlist, w.priority AS wish_priority
  FROM catalog_sets s
  LEFT JOIN (SELECT set_num, COUNT(*) AS cnt, MAX(created_at) AS added_at FROM owned_sets GROUP BY set_num) o ON o.set_num = s.set_num
  LEFT JOIN wishlist w ON w.set_num = s.set_num
  LEFT JOIN catalog_themes t ON t.id = s.theme_id`;

export async function getRecentlyAdded(limit = 12): Promise<SetRow[]> {
  const res = await client.execute({
    sql: `${SET_SELECT} WHERE o.set_num IS NOT NULL ORDER BY o.added_at DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => mapSetRow(r as Record<string, unknown>));
}

/** Owned or wished sets that retire within the window (default 6 months). */
export async function getRetiringSoon(days = 183, limit = 12): Promise<SetRow[]> {
  const res = await client.execute({
    sql: `${SET_SELECT}
          WHERE (o.set_num IS NOT NULL OR w.set_num IS NOT NULL)
            AND COALESCE(s.exit_date_manual, s.exit_date) >= date('now')
            AND COALESCE(s.exit_date_manual, s.exit_date) <= date('now', ?)
          ORDER BY COALESCE(s.exit_date_manual, s.exit_date) ASC LIMIT ?`,
    args: [`+${days} days`, limit],
  });
  return res.rows.map((r) => mapSetRow(r as Record<string, unknown>));
}

export async function getImportStatus() {
  const [queue, settings] = await Promise.all([
    client.execute(`SELECT status, COUNT(*) AS n, SUM(set_count) AS sets FROM import_queue GROUP BY status`),
    client.execute(`SELECT key, value FROM app_settings WHERE key IN ('catalog_import_last_run', 'catalog_light_synced_at')`),
  ]);
  const by = Object.fromEntries(queue.rows.map((r) => [String(r.status), { n: Number(r.n), sets: Number(r.sets ?? 0) }]));
  const s = Object.fromEntries(settings.rows.map((r) => [String(r.key), String(r.value)]));
  const inv = await client.execute(
    `SELECT SUM(inventory_status != 'none') AS done, COUNT(*) AS total FROM catalog_sets`,
  );
  return {
    themesDone: by.done?.n ?? 0,
    themesTotal: Object.values(by).reduce((a, b) => a + b.n, 0),
    setsWithInventory: Number(inv.rows[0]?.done ?? 0),
    setsTotal: Number(inv.rows[0]?.total ?? 0),
    lastRun: s.catalog_import_last_run ?? null,
  };
}
