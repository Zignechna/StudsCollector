import Link from "next/link";
import { ExternalLink, Shapes } from "lucide-react";
import { client } from "@/db";
import { buildability, getPoolMap, type PoolKind } from "@/lib/queries/parts";
import { hasRebrickableKey } from "@/lib/rebrickable";
import { fmtNum } from "@/lib/format";
import { ProgressBar } from "@/components/ui";
import { AlternatesLoader, MocChecker, MocInventoryButton } from "./alternates-client";

export async function AlternatesPanel({ setNum, fetchedAt, pool }: { setNum: string; fetchedAt: number | null; pool: PoolKind }) {
  const res = await client.execute({
    sql: `SELECT m.* FROM set_alternates a JOIN catalog_mocs m ON m.moc_num = a.moc_num WHERE a.set_num = ?
          UNION
          SELECT m.* FROM catalog_mocs m WHERE m.inventory_fetched_at IS NOT NULL AND m.moc_num IN (SELECT value FROM json_each(COALESCE((SELECT value FROM app_settings WHERE key = 'checked_mocs'), '[]')))
          ORDER BY num_parts DESC`,
    args: [setNum],
  });
  const poolMap = await getPoolMap(pool);
  const rows = await Promise.all(
    res.rows.map(async (r) => ({
      mocNum: String(r.moc_num),
      name: String(r.name),
      year: r.year == null ? null : Number(r.year),
      numParts: Number(r.num_parts),
      imgUrl: (r.img_url as string) ?? null,
      designer: (r.designer as string) ?? null,
      mocUrl: (r.moc_url as string) ?? null,
      hasInventory: r.inventory_fetched_at != null,
      build: r.inventory_fetched_at != null ? await buildability(String(r.moc_num), poolMap) : null,
    })),
  );
  const base = `/set/${encodeURIComponent(setNum)}?tab=alt`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Karşılaştırılan havuz:</span>
        <Link href={base} className={`chip ${pool === "total" ? "chip-active" : ""}`}>
          Toplam parça havuzu
        </Link>
        <Link href={`${base}&pool=surplus`} className={`chip ${pool === "surplus" ? "chip-active" : ""}`}>
          Fazlalık havuzu
        </Link>
        <div className="ml-auto">
          <AlternatesLoader setNum={setNum} fetched={Boolean(fetchedAt)} hasKey={hasRebrickableKey()} />
        </div>
      </div>

      <MocChecker />

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center p-8 text-center text-sm text-fg-2">
          <Shapes className="mb-2 size-8 text-muted" />
          {fetchedAt ? "Bu set için kayıtlı alternatif build veya MOC yok." : "Alternatif buildleri ve MOC'ları Rebrickable'dan getirmek için yukarıdaki butonu kullan."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((m) => (
            <div key={m.mocNum} className="card flex flex-col overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-tile">
                  {m.imgUrl ? <img src={m.imgUrl} alt={m.name} loading="lazy" className="h-full w-full object-contain p-1" /> : <Shapes className="size-8 text-neutral-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold">{m.name}</div>
                  <div className="text-xs text-muted">
                    <span className="font-mono">{m.mocNum}</span> · {fmtNum(m.numParts)} parça
                    {m.designer ? ` · ${m.designer}` : ""}
                  </div>
                  {m.mocUrl && (
                    <a href={m.mocUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                      Talimatlar <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-auto border-t border-line p-3">
                {m.build ? (
                  <details>
                    <summary className="cursor-pointer list-none">
                      <div className="mb-1.5 flex items-baseline justify-between text-xs">
                        <span className="text-fg-2">
                          {fmtNum(m.build.have)} / {fmtNum(m.build.required)} parça elinde
                        </span>
                        <span className={`font-display text-lg font-bold ${m.build.percent === 100 ? "text-good" : "text-accent"}`}>%{m.build.percent}</span>
                      </div>
                      <ProgressBar owned={m.build.have} total={m.build.required} size="sm" />
                      {m.build.missing.length > 0 && (
                        <div className="mt-2 text-xs font-semibold text-bad">{m.build.missing.length} çeşit eksik — listeyi gör</div>
                      )}
                    </summary>
                    {m.build.missing.length > 0 && (
                      <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                        {m.build.missing.map((p) => (
                          <li key={`${p.partNum}|${p.colorId}`} className="flex items-center gap-2 text-xs">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded bg-tile">
                              {p.imgUrl && <img src={p.imgUrl} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{p.partName}</span>
                              <span className="flex items-center gap-1 text-muted">
                                <span className="inline-block size-2.5 rounded-full border border-black/20" style={{ background: `#${p.rgb}` }} />
                                {p.colorName} · <span className="font-mono">{p.partNum}</span>
                              </span>
                            </span>
                            <span className="shrink-0 font-semibold text-bad tabular-nums">−{p.need - p.have}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                ) : (
                  <MocInventoryButton mocNum={m.mocNum} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
