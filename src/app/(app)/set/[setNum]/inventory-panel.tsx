"use client";

import { useMemo, useState, useTransition } from "react";
import { PackageX, Search } from "lucide-react";
import type { BuildMode, InventoryRow, OwnedCopy } from "@/lib/queries/set-detail";
import { setMissingPart } from "@/app/actions/collection";
import { PartGrid, PartTile } from "@/components/part-tile";
import { toast } from "@/components/toast";
import { fmtNum } from "@/lib/format";

export function InventoryPanel({
  inventory,
  copies,
  missingMap,
  modes,
  inventoryStatus,
  hasApiKey,
}: {
  setNum: string;
  inventory: InventoryRow[];
  copies: OwnedCopy[];
  missingMap: Record<number, Record<string, number>>;
  modes: BuildMode[];
  inventoryStatus: string;
  hasApiKey: boolean;
}) {
  const [q, setQ] = useState("");
  const [showSpares, setShowSpares] = useState(true);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [copyId, setCopyId] = useState<number | null>(null);
  const [local, setLocal] = useState(missingMap);
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return inventory.filter((p) => {
      if (!showSpares && p.isSpare) return false;
      if (onlyMissing && copyId != null && !(local[copyId]?.[`${p.partNum}|${p.colorId}`] > 0)) return false;
      if (!term) return true;
      return (
        p.partNum.toLowerCase().includes(term) ||
        p.partName.toLocaleLowerCase("tr").includes(term) ||
        p.colorName.toLocaleLowerCase("tr").includes(term)
      );
    });
  }, [inventory, q, showSpares, onlyMissing, copyId, local]);

  if (inventory.length === 0) {
    return (
      <div className="card p-6 text-sm text-fg-2">
        {inventoryStatus === "none"
          ? hasApiKey
            ? "Bu setin parça listesi henüz aktarılmadı. Seti koleksiyona eklediğinde Rebrickable'dan otomatik çekilir."
            : "Bu setin parça listesi henüz aktarılmadı. Gece çalışan katalog aktarımı sırası gelince ekler; Rebrickable API anahtarı eklersen anında çekilir."
          : "Bu setin parça listesi yok (örn. kitap, anahtarlık veya dijital ürün olabilir)."}
      </div>
    );
  }

  const regular = inventory.filter((p) => !p.isSpare);
  const spares = inventory.filter((p) => p.isSpare);
  const sum = (rows: InventoryRow[]) => rows.reduce((a, p) => a + p.quantity, 0);
  const missingTotal = copyId != null ? Object.values(local[copyId] ?? {}).reduce((a, b) => a + b, 0) : 0;

  const mark = (p: InventoryRow, qty: number) => {
    if (copyId == null) return;
    const key = `${p.partNum}|${p.colorId}`;
    setLocal((cur) => ({ ...cur, [copyId]: { ...cur[copyId], [key]: qty } }));
    start(async () => {
      const res = await setMissingPart(copyId, p.partNum, p.colorId, qty);
      if (!res.ok) toast(res.message ?? "Kaydedilemedi.", "error");
    });
  };

  // A part may appear both as regular and spare; missing marks are per part+color, so cap by the combined quantity.
  const combinedQty = new Map<string, number>();
  for (const p of inventory) combinedQty.set(`${p.partNum}|${p.colorId}`, (combinedQty.get(`${p.partNum}|${p.colorId}`) ?? 0) + p.quantity);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="font-display text-xl font-bold tabular-nums">{fmtNum(sum(regular))}</span>
          <span className="text-muted"> parça · {regular.length} çeşit</span>
        </span>
        {spares.length > 0 && (
          <span>
            <span className="font-display text-xl font-bold tabular-nums text-info">{fmtNum(sum(spares))}</span>
            <span className="text-muted"> yedek parça (fazlalık)</span>
          </span>
        )}
        {modes.length > 0 && <span className="text-xs text-muted">{modes.length} mod tanımlı</span>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parça, renk veya numara…" className="input h-9 rounded-full pl-9" aria-label="Parça ara" />
        </div>
        <button type="button" className={`chip ${showSpares ? "chip-active" : ""}`} onClick={() => setShowSpares((v) => !v)}>
          Yedekler
        </button>
        {copies.length > 0 && (
          <>
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <label className="sr-only" htmlFor="mark-copy">
              Eksik işaretleme
            </label>
            <select
              id="mark-copy"
              className={`input h-8 w-auto rounded-full py-0 text-xs font-semibold ${copyId != null ? "border-bad text-bad" : ""}`}
              value={copyId ?? ""}
              onChange={(e) => {
                setCopyId(e.target.value ? Number(e.target.value) : null);
                setOnlyMissing(false);
              }}
            >
              <option value="">Eksik parça işaretle…</option>
              {copies.map((c, i) => (
                <option key={c.id} value={c.id}>
                  Kopya #{i + 1}
                  {c.missingCount ? ` (${c.missingCount} eksik)` : ""}
                </option>
              ))}
            </select>
            {copyId != null && (
              <button type="button" className={`chip ${onlyMissing ? "chip-active" : ""}`} onClick={() => setOnlyMissing((v) => !v)}>
                <PackageX className="size-3.5" /> Sadece eksikler ({missingTotal})
              </button>
            )}
          </>
        )}
      </div>
      {copyId != null && (
        <p className="mb-3 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">
          Eksik işaretleme açık: her parçanın altındaki +/− ile bu kopyada eksik olan adedi gir. Otomatik kaydedilir.
        </p>
      )}

      <PartGrid>
        {filtered.map((p) => {
          const key = `${p.partNum}|${p.colorId}`;
          const marked = copyId != null ? (local[copyId]?.[key] ?? 0) : undefined;
          return (
            <PartTile
              key={`${key}|${p.isSpare}`}
              part={p}
              marked={marked}
              markLabel="Eksik"
              max={combinedQty.get(key)}
              onMark={copyId != null && !p.isSpare ? (qty) => mark(p, qty) : undefined}
              dimmed={copyId != null && p.isSpare}
            />
          );
        })}
      </PartGrid>
      {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted">Eşleşen parça yok.</p>}
    </div>
  );
}
