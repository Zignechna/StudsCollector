"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
        Şifre
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        className="h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white outline-none placeholder:text-white/30 focus:border-accent focus:ring-2 focus:ring-accent/25"
        placeholder="••••••••"
      />
      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary mt-4 h-11 w-full">
        <LogIn className="size-4" />
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
