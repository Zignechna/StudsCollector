import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, verifySessionToken } from "./session";

const PASSWORD_KEY = "password_hash";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function matchesHash(password: string, stored: string) {
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function constantTimeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** A password stored in the database (set from Settings) overrides APP_PASSWORD. */
export async function checkPassword(password: string): Promise<boolean> {
  const row = await db.query.appSettings.findFirst({ where: eq(schema.appSettings.key, PASSWORD_KEY) });
  if (row) return matchesHash(password, row.value);
  const envPassword = process.env.APP_PASSWORD;
  if (!envPassword) return false;
  return constantTimeEqual(password, envPassword);
}

export async function setPassword(password: string) {
  const value = hashPassword(password);
  await db
    .insert(schema.appSettings)
    .values({ key: PASSWORD_KEY, value })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value } });
}

export async function startSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Call at the top of every Server Action / Route Handler. */
export async function requireAuth() {
  if (!(await isAuthenticated())) redirect("/login");
}
