"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Pencil, RefreshCw } from "lucide-react";
import type { SetRow } from "@/lib/queries/sets";
import { fmtDate, fmtMonth, humanizeDays, relativeDays } from "@/lib/format";
import { effectiveExit, retirementStatus, statusLabels } from "@/lib/retirement";
import { refreshSetData, setManualExitDate } from "@/app/actions/collection";
import { toastResult } from "@/components/toast";

const tone = {
  retired: "bg-surface-3 text-fg-2",
  retiring: "bg-warn-soft text-warn",
  available: "bg-good-soft text-good",
  unknown: "bg-surface-3 text-muted",
};

export function RetirementPanel({ set, checkedAt }: { set: SetRow; checkedAt: number | null }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const status = retirementStatus(set);
  const exit = effectiveExit(set);
  const days = relativeDays(exit);

  return (
    <div className={`mt-5 rounded-xl border p-4 ${status === "retiring" ? "border-warn/40 bg-warn-soft/40" : "border-line bg-surface"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <CalendarClock className={`size-5 ${status === "retiring" ? "text-warn" : "text-muted"}`} />
        <span className={`badge ${tone[status]} px-2 py-1 text-[11px]`}>{statusLabels[status]}</span>
        <div className="text-sm">
          {exit ? (
            <>
              Emeklilik: <span className="font-semibold">{fmtMonth(exit)}</span>
              {set.exitDateManual && <span className="text-muted"> (tahmini, elle girildi)</span>}
              {days != null && <span className="text-muted"> · {humanizeDays(days)}</span>}
            </>
          ) : (
            <span className="text-muted">Emeklilik tarihi bilinmiyor</span>
          )}
        </div>
        <div className="ml-auto flex gap-1">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="size-3.5" /> Tahmini tarih
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={pending}
            onClick={() => start(async () => toastResult(await refreshSetData(set.setNum)))}
            title="Brickset'ten yeniden çek"
          >
            <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span>Çıkış: {fmtDate(set.launchDate)}</span>
        <span>Brickset emeklilik: {set.exitDate ? fmtDate(set.exitDate) : "bilinmiyor"}</span>
        {checkedAt && <span>Son kontrol: {fmtDate(checkedAt)}</span>}
      </div>
      {editing && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = String(new FormData(e.currentTarget).get("date") || "");
            start(async () => {
              toastResult(await setManualExitDate(set.setNum, v || null));
              setEditing(false);
            });
          }}
        >
          <div>
            <label className="label" htmlFor="manual-exit">
              Tahmini emeklilik (API değerinin önüne geçer)
            </label>
            <input id="manual-exit" name="date" type="month" defaultValue={set.exitDateManual?.slice(0, 7) ?? ""} className="input h-9" />
          </div>
          <button className="btn-primary btn-sm h-9" disabled={pending}>
            Kaydet
          </button>
          {set.exitDateManual && (
            <button
              type="button"
              className="btn-ghost btn-sm h-9"
              disabled={pending}
              onClick={() => start(async () => toastResult(await setManualExitDate(set.setNum, null)))}
            >
              Elle girilen tarihi sil
            </button>
          )}
        </form>
      )}
    </div>
  );
}
