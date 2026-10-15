"use server";

import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAuth, setPassword, startSession } from "@/lib/auth";

export type LoginState = { error?: string };

// Small in-memory brake against password guessing (per server instance).
const attempts = new Map<string, { count: number; until: number }>();

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const key = "global";
  const a = attempts.get(key);
  if (a && a.until > Date.now()) {
    return { error: "Çok fazla hatalı deneme. Biraz bekleyip tekrar dene." };
  }
  if (!(await checkPassword(password))) {
    const count = (a?.count ?? 0) + 1;
    attempts.set(key, { count, until: count >= 5 ? Date.now() + 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Şifre hatalı." };
  }
  attempts.delete(key);
  await startSession();
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function changePassword(_prev: { ok?: boolean; message?: string }, formData: FormData) {
  await requireAuth();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (!(await checkPassword(current))) return { ok: false, message: "Mevcut şifre hatalı." };
  if (next.length < 8) return { ok: false, message: "Yeni şifre en az 8 karakter olmalı." };
  if (next !== repeat) return { ok: false, message: "Yeni şifreler eşleşmiyor." };
  await setPassword(next);
  return { ok: true, message: "Şifre değiştirildi." };
}
