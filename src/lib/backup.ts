import { client } from "@/db";

/** User-owned tables (catalog cache tables can always be re-imported, so they are not backed up). */
export const USER_TABLES = [
  "owned_sets",
  "missing_parts",
  "loose_parts",
  "build_modes",
  "build_mode_leftovers",
  "wishlist",
  "custom_collections",
  "custom_collection_items",
  "owned_minifigs",
  "tracked_products",
  "product_listings",
  "price_history",
  "price_alerts",
  "push_subscriptions",
  "notification_log",
] as const;

/** Manual catalog values entered by the user. */
const MANUAL_CATALOG_SQL = "SELECT set_num, exit_date_manual FROM catalog_sets WHERE exit_date_manual IS NOT NULL";

export async function exportUserData() {
  const tables: Record<string, unknown[]> = {};
  for (const t of USER_TABLES) {
    const res = await client.execute(`SELECT * FROM ${t}`);
    tables[t] = res.rows.map((r) => ({ ...r }));
  }
  const manual = await client.execute(MANUAL_CATALOG_SQL);
  const settings = await client.execute("SELECT key, value FROM app_settings WHERE key IN ('password_hash', 'checked_mocs')");
  return {
    app: "studscollector",
    version: 1,
    exportedAt: new Date().toISOString(),
    tables,
    manualExitDates: manual.rows.map((r) => ({ ...r })),
    settings: settings.rows.map((r) => ({ ...r })),
  };
}
