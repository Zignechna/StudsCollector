"use client";

import { useTransition } from "react";
import { Calculator, Download, Search } from "lucide-react";
import { checkMoc, loadAlternates, loadMocInventory } from "@/app/actions/collection";
import { toast, toastResult } from "@/components/toast";

export function AlternatesLoader({ setNum, fetched, hasKey }: { setNum: string; fetched: boolean; hasKey: boolean }) {
  const [pending, start] = useTransition();
  if (!hasKey) return <span className="text-xs text-muted">Rebrickable API anahtarı gerekli</span>;
  return (
    <button type="button" className="btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => toastResult(await loadAlternates(setNum), "Alternatifler güncellendi."))}>
      <Download className="size-3.5" />
      {pending ? "Getiriliyor…" : fetched ? "Yeniden getir" : "Rebrickable'dan getir"}
    </button>
  );
}

export function MocInventoryButton({ mocNum }: { mocNum: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-secondary btn-sm w-full"
      disabled={pending}
      onClick={() => start(async () => toastResult(await loadMocInventory(mocNum), "Parça listesi alındı."))}
    >
      <Calculator className="size-3.5" />
      {pending ? "Parça listesi alınıyor…" : "Yapılabilirliği hesapla"}
    </button>
  );
}

export function MocChecker() {
  const [pending, start] = useTransition();
  return (
    <form
      className="mb-5 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const v = String(new FormData(form).get("moc") ?? "").trim();
        if (!v) return;
        start(async () => {
          const res = await checkMoc(v);
          if (res.ok) {
            toast("MOC eklendi; yapılabilirlik aşağıda.", "success");
            form.reset();
          } else toast(res.message ?? "MOC bulunamadı.", "error");
        });
      }}
    >
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="moc" placeholder="Başka bir MOC kontrol et (ör. MOC-12345)" className="input h-9 pl-9" aria-label="MOC numarası" />
      </div>
      <button className="btn-secondary btn-sm h-9" disabled={pending}>
        {pending ? "Kontrol ediliyor…" : "Kontrol et"}
      </button>
    </form>
  );
}
