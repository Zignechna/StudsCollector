import "./env";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, databaseUrl } from "../src/db";

async function main() {
  const url = databaseUrl();
  console.log(`Running migrations on ${url.startsWith("file:") ? url : url.replace(/\/\/.*@/, "//")}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
