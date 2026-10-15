"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCustomCollection, saveCustomCollection } from "@/app/actions/collection";
import { toast, toastResult } from "@/components/toast";

export function CollectionForm({
  initial,
}: {
  initial?: { id: number; name: string; description: string | null; coverImg: string | null };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await saveCustomCollection(initial?.id ?? null, fd);
          if (!res.ok) return toast(res.message ?? "Kaydedilemedi.", "error");
          toast("Kaydedildi.");
          if (!initial && res.id) router.push(`/koleksiyonlar/ozel/${res.id}`);
        });
      }}
    >
      <div>
        <label className="label" htmlFor="cc-name">
          Ad
        </label>
        <input id="cc-name" name="name" required defaultValue={initial?.name} placeholder="Marvel Modular" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="cc-desc">
          Açıklama
        </label>
        <textarea id="cc-desc" name="description" defaultValue={initial?.description ?? ""} rows={3} className="input h-auto py-2" />
      </div>
      <div>
        <label className="label" htmlFor="cc-cover">
          Kapak görseli URL (boş bırakırsan setlerden seçilir)
        </label>
        <input id="cc-cover" name="coverImg" type="url" defaultValue={initial?.coverImg ?? ""} className="input" placeholder="https://…" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={pending}>
          {initial ? "Kaydet" : "Oluştur"}
        </button>
        {initial &&
          (confirm ? (
            <button
              type="button"
              className="btn-danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  toastResult(await deleteCustomCollection(initial.id), "Koleksiyon silindi.");
                  router.push("/koleksiyonlar/ozel");
                })
              }
            >
              Evet, sil
            </button>
          ) : (
            <button type="button" className="btn-ghost text-bad" onClick={() => setConfirm(true)}>
              <Trash2 className="size-4" /> Koleksiyonu sil
            </button>
          ))}
      </div>
    </form>
  );
}
