"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/actions/auth";
import { toast } from "@/components/toast";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {} as { ok?: boolean; message?: string });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    toast(state.message, state.ok ? "success" : "error");
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:max-w-sm">
      <div>
        <label className="label" htmlFor="pw-current">
          Mevcut şifre
        </label>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="pw-next">
          Yeni şifre (en az 8 karakter)
        </label>
        <input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="pw-repeat">
          Yeni şifre (tekrar)
        </label>
        <input id="pw-repeat" name="repeat" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      {state.message && !state.ok && <p className="text-sm text-bad">{state.message}</p>}
      <button className="btn-primary w-fit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Şifreyi değiştir"}
      </button>
    </form>
  );
}
