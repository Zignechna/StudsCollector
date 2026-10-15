"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: Kind };

const EVENT = "bk-toast";

export function toast(message: string, kind: Kind = "success") {
  if (typeof window === "undefined" || !message) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, kind } }));
}

/** Shows the result of a server action as a toast. */
export function toastResult(res: { ok: boolean; message?: string } | undefined, fallback?: string) {
  if (!res) return;
  if (res.message) toast(res.message, res.ok ? "success" : "error");
  else if (fallback && res.ok) toast(fallback, "success");
  else if (!res.ok) toast("Bir hata oluştu.", "error");
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let id = 0;
    const onToast = (e: Event) => {
      const { message, kind } = (e as CustomEvent<{ message: string; kind: Kind }>).detail;
      const t = { id: ++id, message, kind };
      setItems((cur) => [...cur.slice(-3), t]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), kind === "error" ? 6000 : 3500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
      {items.map((t) => {
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-fg shadow-card"
          >
            <Icon
              className={`mt-0.5 size-4 shrink-0 ${t.kind === "success" ? "text-good" : t.kind === "error" ? "text-bad" : "text-info"}`}
            />
            <span className="flex-1">{t.message}</span>
            <button
              aria-label="Kapat"
              className="text-muted hover:text-fg"
              onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))}
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
