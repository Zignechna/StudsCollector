/**
 * Writes a JSON backup of all user data to backups/brickkasa-YYYY-MM-DD.json.
 * Catalog tables are not included (they can always be re-imported from Rebrickable).
 * Usage: npm run db:backup
 */
import "./env";
import fs from "node:fs";
import path from "node:path";
import { exportUserData } from "../src/lib/backup";

async function main() {
  const data = await exportUserData();
  const dir = path.resolve(process.env.BACKUP_DIR || "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `brickkasa-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const counts = Object.entries(data.tables).map(([t, rows]) => `${t}=${rows.length}`).join(", ");
  console.log(`Backup written to ${file}\n${counts}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
