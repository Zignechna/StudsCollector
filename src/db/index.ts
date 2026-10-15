import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function databaseUrl() {
  return process.env.TURSO_DATABASE_URL || "file:local.db";
}

const globalForDb = globalThis as unknown as { __libsql?: Client; __db?: LibSQLDatabase<typeof schema> };

export const client: Client =
  globalForDb.__libsql ??
  createClient({
    url: databaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });

export const db: LibSQLDatabase<typeof schema> = globalForDb.__db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__libsql = client;
  globalForDb.__db = db;
}

export { schema };
