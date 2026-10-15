/**
 * Restores user data from a backup JSON (created by db:backup or the Settings page).
 * Existing user rows are REPLACED. Catalog tables are untouched.
 * Usage: npm run db:restore -- backups/studscollector-2026-10-15.json
 */
import "./env";
import fs from "node:fs";
import type { InStatement, InValue } from "@libsql/client";
import { client } from "../src/db";
import { USER_TABLES } from "../src/lib/backup";

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error("Usage: npm run db:restore -- <backup.json>");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    app: string;
    tables: Record<string, Record<string, InValue>[]>;
    manualExitDates?: { set_num: string; exit_date_manual: string }[];
    settings?: { key: string; value: string }[];
  };
  if (data.app !== "studscollector" && data.app !== "brickkasa") throw new Error("Not a StudsCollector backup file.");
  const statements: InStatement[] = [];
  for (const t of USER_TABLES) statements.push(`DELETE FROM ${t}`);
  for (const t of USER_TABLES) {
    for (const row of data.tables[t] ?? []) {
      const cols = Object.keys(row);
      statements.push({ sql: `INSERT INTO ${t} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, args: cols.map((c) => row[c]) });
    }
  }
  for (const m of data.manualExitDates ?? []) {
    statements.push({ sql: "UPDATE catalog_sets SET exit_date_manual = ? WHERE set_num = ?", args: [m.exit_date_manual, m.set_num] });
  }
  for (const s of data.settings ?? []) {
    statements.push({ sql: "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [s.key, s.value] });
  }
  await client.batch(statements, "write");
  console.log(`Restored ${statements.length} statement(s) from ${file}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
