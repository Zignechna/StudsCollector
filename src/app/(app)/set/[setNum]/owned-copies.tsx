"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PackageX, Trash2 } from "lucide-react";
import type { OwnedCopy } from "@/lib/queries/set-detail";
import { deleteOwnedSet, updateOwnedSet } from "@/app/actions/collection";
import { STATUS_OPTIONS } from "@/components/add-set-dialog";
import { toastResult } from "@/components/toast";

export function OwnedCopies({ copies, modes }: { setNum: string; copies: OwnedCopy[]; modes: { id: number; name: string }[] }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<number | null>(null);
  return (
    <div className="mt-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Kopyalarım</h2>
      <div className="space-y-2">
        {copies.map((c, i) => (
          <form
            key={c.id}
            className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end"
            onChange={(e) => {
              if ((e.target as unknown as HTMLInputElement).name === "notes") return; // saved on blur
              const fd = new FormData(e.currentTarget);
              start(async () => toastResult(await updateOwnedSet(c.id, fd)));
            }}
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="col-span-2 flex items-center gap-2 font-display text-lg font-bold sm:col-span-1 sm:pb-1.5">
              #{i + 1}
              {c.missingCount > 0 && (
                <Link href={`/eksikler#set-${c.id}`} className="badge bg-bad-soft text-bad">
                  <PackageX className="size-3" /> {c.missingCount} eksik
                </Link>
              )}
            </div>
            <div>
              <label className="label" htmlFor={`st-${c.id}`}>
                Durum
              </label>
              <select id={`st-${c.id}`} name="status" defaultValue={c.status} className="input h-9">
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`dt-${c.id}`}>
                Alış tarihi
              </label>
              <input id={`dt-${c.id}`} name="acquiredAt" type="date" defaultValue={c.acquiredAt ?? ""} className="input h-9" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label" htmlFor={`md-${c.id}`}>
                Yapılan mod
              </label>
              <select id={`md-${c.id}`} name="buildModeId" defaultValue={c.buildModeId ?? ""} className="input h-9" disabled={!modes.length}>
                <option value="">{modes.length ? "Ana model" : "Mod tanımlı değil"}</option>
                {modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
              {confirm === c.id ? (
                <>
                  <button
                    type="button"
                    className="btn-danger btn-sm h-9"
                    disabled={pending}
                    onClick={() => start(async () => toastResult(await deleteOwnedSet(c.id), "Kopya silindi."))}
                  >
                    Sil
                  </button>
                  <button type="button" className="btn-ghost btn-sm h-9" onClick={() => setConfirm(null)}>
                    Vazgeç
                  </button>
                </>
              ) : (
                <button type="button" className="btn-ghost btn-sm h-9" onClick={() => setConfirm(c.id)} aria-label="Kopyayı sil">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <div className="col-span-2 sm:col-span-5">
              <input
                name="notes"
                defaultValue={c.notes ?? ""}
                placeholder="Not ekle…"
                className="input h-9"
                aria-label="Not"
                onBlur={(e) => {
                  if (e.currentTarget.value === (c.notes ?? "")) return;
                  const fd = new FormData(e.currentTarget.form!);
                  start(async () => toastResult(await updateOwnedSet(c.id, fd)));
                }}
              />
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
