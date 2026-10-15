/**
 * Copies the values in .env.local to the GitHub repository's Actions secrets (uses the gh CLI).
 * Only the keys the scheduled workflows need are sent. Usage: npm run secrets:push
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { parse } from "dotenv";

const KEYS = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "REBRICKABLE_API_KEY",
  "BRICKSET_API_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "BACKUP_PASSPHRASE",
];

const env = parse(fs.readFileSync(".env.local"));
let pushed = 0;
for (const key of KEYS) {
  const value = env[key]?.trim();
  if (!value) {
    console.log(`- ${key}: boş, atlandı`);
    continue;
  }
  execFileSync("gh", ["secret", "set", key], { input: value, stdio: ["pipe", "inherit", "inherit"] });
  console.log(`✓ ${key}`);
  pushed++;
}
console.log(`${pushed} secret GitHub'a yüklendi.`);
if (!env.TURSO_DATABASE_URL) console.log("Uyarı: TURSO_DATABASE_URL boş — GitHub Actions veritabanına bağlanamaz.");
