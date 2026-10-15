/**
 * Refreshes Brickset launch/exit dates for owned and wishlist sets (GitHub Actions, nightly).
 * The free Brickset key allows ~100 getSets calls a day, so each run is capped.
 */
import "./env";
import { client } from "../src/db";
import { hasBricksetKey, refreshBrickset, REFRESH_DAYS } from "../src/lib/brickset";

const MAX_CALLS = Number(process.env.BRICKSET_MAX_CALLS || 70);

async function main() {
  if (!hasBricksetKey()) {
    console.log("BRICKSET_API_KEY not set — skipping.");
    return;
  }
  const res = await client.execute({
    sql: `SELECT s.set_num FROM catalog_sets s
          WHERE (s.set_num IN (SELECT set_num FROM owned_sets) OR s.set_num IN (SELECT set_num FROM wishlist)
                 OR s.set_num IN (SELECT set_num FROM custom_collection_items WHERE set_num IS NOT NULL))
            AND (s.brickset_checked_at IS NULL OR s.brickset_checked_at < unixepoch() - ?)
          ORDER BY s.brickset_checked_at IS NOT NULL, s.brickset_checked_at
          LIMIT ?`,
    args: [REFRESH_DAYS * 86400, MAX_CALLS],
  });
  let ok = 0;
  for (const r of res.rows) {
    if (await refreshBrickset(String(r.set_num), true)) ok++;
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log(`Brickset: ${ok}/${res.rows.length} set(s) refreshed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
