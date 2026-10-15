"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { addOwnedSet, getBuildModesFor } from "@/app/actions/collection";
import { toast } from "./toast";

export const STATUS_OPTIONS = [
  { value: "built", label: "Yapıldı" },
  { value: "sealed", label: "Kutuda (açılmamış)" },
  { value: "disassembled", label: "Söküldü" },
];

export function AddSetDialog({
  setNum,
  name,
  onClose,
  redirectToSet = false,
}: {
  setNum: string;
  name: string;
  onClose: () => void;
  redirectToSet?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modes, setModes] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    getBuildModesFor(setNum).then(setModes).catch(() => setModes([]));
  }, [setNum]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`${name} ekle`}>
      <button className="absolute inset-0 bg-black/60" aria-label="Kapat" onClick={onClose} />
      <form
        className="pb-safe relative w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-card sm:rounded-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await addOwnedSet({
              setNum,
              status: String(fd.get("status")),
              acquiredAt: String(fd.get("acquiredAt") || "") || null,
              quantity: Number(fd.get("quantity") || 1),
              notes: String(fd.get("notes") || "") || null,
              buildModeId: fd.get("buildModeId") ? Number(fd.get("buildModeId")) : null,
            });
            if (!res.ok) {
              toast(res.message ?? "Eklenemedi.", "error");
              return;
            }
            toast(res.message ?? `${name} koleksiyona eklendi.`, res.message ? "info" : "success");
            onClose();
            if (redirectToSet) router.push(`/set/${encodeURIComponent(setNum)}`);
          });
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Koleksiyona ekle</div>
            <div lang="en" className="font-display text-xl font-bold uppercase leading-tight">{name}</div>
            <div className="font-mono text-xs text-muted">{setNum}</div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost size-9 p-0" aria-label="Kapat">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="add-status">
              Durum
            </label>
            <select id="add-status" name="status" className="input" defaultValue="built">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {modes.length > 0 && (
            <div className="col-span-2">
              <label className="label" htmlFor="add-mode">
                Hangi modu yaptın?
              </label>
              <select id="add-mode" name="buildModeId" className="input" defaultValue="">
                <option value="">Ana model</option>
                {modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="add-date">
              Alış tarihi
            </label>
            <input id="add-date" name="acquiredAt" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="add-qty">
              Adet
            </label>
            <input id="add-qty" name="quantity" type="number" min={1} max={50} defaultValue={1} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="add-notes">
              Not
            </label>
            <input id="add-notes" name="notes" className="input" placeholder="İsteğe bağlı" />
          </div>
        </div>
        <button type="submit" disabled={pending} className="btn-primary mt-5 h-11 w-full">
          {pending ? "Ekleniyor… (parça listesi çekiliyor)" : "Koleksiyona ekle"}
        </button>
      </form>
    </div>
  );
}
