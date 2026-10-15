"use client";

import { useMemo, useState, useTransition } from "react";
import { Layers, Plus, Search, Trash2 } from "lucide-react";
import type { BuildMode, InventoryRow } from "@/lib/queries/set-detail";
import { createBuildMode, deleteBuildMode, renameBuildMode, setLeftover } from "@/app/actions/collection";
import { PartGrid, PartTile } from "@/components/part-tile";
import { toast, toastResult } from "@/components/toast";

export function BuildModesPanel({ setNum, modes, inventory }: { setNum: string; modes: BuildMode[]; inventory: InventoryRow[] }) {
  const [pending, start] = useTransition();
  const [activeId, setActiveId] = useState<number | null>(modes[0]?.id ?? null);
  const [q, setQ] = useState("");
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [local, setLocal] = useState<Record<number, Record<string, number>>>(() =>
    Object.fromEntries(modes.map((m) => [m.id, Object.fromEntries(m.leftovers.map((l) => [`${l.partNum}|${l.colorId}`, l.quantity]))])),
  );
  const active = modes.find((m) => m.id === activeId) ?? null;

  // Leftovers can only come from non-spare parts (spares are surplus anyway), merged per part+color.
  const parts = useMemo(() => {
    const map = new Map<string, InventoryRow>();
    for (const p of inventory) {
      if (p.isSpare) continue;
      const k = `${p.partNum}|${p.colorId}`;
      const cur = map.get(k);
      map.set(k, cur ? { ...cur, quantity: cur.quantity + p.quantity } : p);
    }
    const term = q.trim().toLocaleLowerCase("tr");
    return [...map.values()].filter(
      (p) =>
        (!onlyMarked || (activeId != null && (local[activeId]?.[`${p.partNum}|${p.colorId}`] ?? 0) > 0)) &&
        (!term || p.partNum.toLowerCase().includes(term) || p.partName.toLocaleLowerCase("tr").includes(term) || p.colorName.toLocaleLowerCase("tr").includes(term)),
    );
  }, [inventory, q, onlyMarked, activeId, local]);

  const leftoverTotal = activeId != null ? Object.values(local[activeId] ?? {}).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <div className="card mb-5 p-4 text-sm text-fg-2">
        <p>
          Çok modlu setlerde (ör. DeLorean&apos;ın uçan modu, 3&apos;ü 1 arada setler) toplam parça sayısı değişmez; sadece yaptığın moda göre
          <span className="font-semibold text-fg"> hangi parçaların artacağı (fazlalık)</span> değişir. Burada her mod için artan parçaları bir kez tanımla, sonra
          kopyalarında hangi modu yaptığını seç.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {modes.map((m) => (
          <button key={m.id} type="button" className={`chip h-9 ${activeId === m.id ? "chip-active" : ""}`} onClick={() => setActiveId(m.id)}>
            <Layers className="size-3.5" /> {m.name}
          </button>
        ))}
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = String(new FormData(form).get("name") ?? "");
            start(async () => {
              const res = await createBuildMode(setNum, name);
              toastResult(res, "Mod eklendi.");
              if (res.ok && res.id) {
                setLocal((cur) => ({ ...cur, [res.id!]: {} }));
                setActiveId(res.id);
                form.reset();
              }
            });
          }}
        >
          <input name="name" placeholder="Yeni mod adı (ör. Part II – Uçan mod)" className="input h-9 w-64" aria-label="Yeni mod adı" />
          <button className="btn-primary btn-sm h-9" disabled={pending}>
            <Plus className="size-4" /> Mod ekle
          </button>
        </form>
      </div>

      {active ? (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              key={active.id}
              defaultValue={active.name}
              className="input h-9 w-auto font-semibold"
              aria-label="Mod adı"
              onBlur={(e) => e.currentTarget.value !== active.name && start(async () => toastResult(await renameBuildMode(active.id, e.currentTarget.value)))}
            />
            <span className="text-sm text-muted">
              Bu modda artan: <span className="font-semibold text-info">{leftoverTotal}</span> parça
            </span>
            <button
              type="button"
              className="btn-ghost btn-sm ml-auto text-bad"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  toastResult(await deleteBuildMode(active.id), "Mod silindi.");
                  setActiveId(null);
                })
              }
            >
              <Trash2 className="size-4" /> Modu sil
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parça ara…" className="input h-9 rounded-full pl-9" aria-label="Parça ara" />
            </div>
            <button type="button" className={`chip ${onlyMarked ? "chip-active" : ""}`} onClick={() => setOnlyMarked((v) => !v)}>
              Sadece artanlar
            </button>
          </div>
          {inventory.length === 0 ? (
            <p className="text-sm text-muted">Artan parçaları tanımlamak için önce setin parça listesi gerekli.</p>
          ) : (
            <PartGrid>
              {parts.map((p) => {
                const key = `${p.partNum}|${p.colorId}`;
                return (
                  <PartTile
                    key={key}
                    part={p}
                    marked={local[active.id]?.[key] ?? 0}
                    markLabel="Artan"
                    onMark={(qty) => {
                      setLocal((cur) => ({ ...cur, [active.id]: { ...cur[active.id], [key]: qty } }));
                      start(async () => {
                        const res = await setLeftover(active.id, p.partNum, p.colorId, qty);
                        if (!res.ok) toast(res.message ?? "Kaydedilemedi.", "error");
                      });
                    }}
                  />
                );
              })}
            </PartGrid>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Bu set için henüz mod tanımlanmadı.</p>
      )}
    </div>
  );
}
