/**
 * Sends one Web Push per set when a wishlist (or owned-but-sealed watch) set gets close to retirement.
 * Thresholds: 90 and 30 days. notification_log prevents duplicates.
 */
import "./env";
import { client } from "../src/db";
import { sendPushToAll } from "../src/lib/push";

const WINDOWS = [30, 90];

async function main() {
  const res = await client.execute(`
    SELECT s.set_num, s.name, COALESCE(s.exit_date_manual, s.exit_date) AS exit_date,
           CAST(julianday(COALESCE(s.exit_date_manual, s.exit_date)) - julianday('now') AS INTEGER) AS days
    FROM wishlist w JOIN catalog_sets s ON s.set_num = w.set_num
    WHERE COALESCE(s.exit_date_manual, s.exit_date) >= date('now')
      AND COALESCE(s.exit_date_manual, s.exit_date) <= date('now', '+90 days')`);
  let sent = 0;
  for (const r of res.rows) {
    const days = Number(r.days);
    const window = WINDOWS.find((w) => days <= w)!;
    const key = `retire:${r.set_num}:${r.exit_date}:${window}`;
    const done = await client.execute({ sql: "SELECT 1 FROM notification_log WHERE key = ?", args: [key] });
    if (done.rows.length) continue;
    const result = await sendPushToAll({
      title: `⏳ Emekliliğe ${days} gün`,
      body: `${r.name} (${r.set_num}) istek listende ve yakında emekli oluyor.`,
      url: `/set/${encodeURIComponent(String(r.set_num))}`,
      tag: `retire-${r.set_num}`,
    });
    await client.execute({ sql: "INSERT INTO notification_log (key) VALUES (?) ON CONFLICT DO NOTHING", args: [key] });
    sent += result.sent;
  }
  console.log(`Retirement alerts: ${res.rows.length} candidate(s), ${sent} push(es) sent.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
