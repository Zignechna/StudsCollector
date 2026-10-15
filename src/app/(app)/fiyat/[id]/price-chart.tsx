"use client";

import { useMemo, useRef, useState } from "react";
import { LineChart } from "lucide-react";
import { fmtMoney } from "@/lib/format";

type Series = {
  id: number;
  label: string;
  currency: string;
  color: string;
  rate: number | null;
  points: { at: number; price: number; inStock: boolean }[];
};

const W = 800;
const H = 280;
const PAD = { l: 64, r: 16, t: 16, b: 32 };
const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });

/** Step chart: a price stays valid until the next recorded change (prices are stored only on change). */
export function PriceChart({ series, now }: { series: Series[]; now: number }) {
  const hasEur = series.some((s) => s.currency !== "TRY");
  const [convert, setConvert] = useState(true);
  const [hidden, setHidden] = useState<number[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const prepared = useMemo(() => {
    return series
      .filter((s) => s.points.length && !hidden.includes(s.id))
      .filter((s) => convert || !hasEur || s.currency === "TRY" || series.every((x) => x.currency === s.currency))
      .map((s) => {
        const factor = convert && s.currency !== "TRY" ? (s.rate ?? 1) : 1;
        const pts = s.points.map((p) => ({ at: p.at, v: p.price * factor, inStock: p.inStock }));
        return { ...s, pts, end: now, unit: convert ? "TRY" : s.currency };
      });
  }, [series, hidden, convert, hasEur, now]);

  const all = prepared.flatMap((s) => s.pts);
  if (!series.some((s) => s.points.length)) {
    return (
      <div className="card flex flex-col items-center p-8 text-center text-sm text-muted">
        <LineChart className="mb-2 size-8" />
        Henüz fiyat geçmişi yok. Otomatik kontrol çalıştıkça (günde birkaç kez) burada grafik oluşur.
      </div>
    );
  }

  const tMin = Math.min(...all.map((p) => p.at), ...prepared.map((s) => s.end)) || 0;
  const tMax = Math.max(...prepared.map((s) => s.end), tMin + 86400);
  const vMinRaw = Math.min(...all.map((p) => p.v));
  const vMaxRaw = Math.max(...all.map((p) => p.v));
  const span = Math.max(vMaxRaw - vMinRaw, vMaxRaw * 0.05, 1);
  const vMin = Math.max(0, vMinRaw - span * 0.15);
  const vMax = vMaxRaw + span * 0.15;
  const x = (t: number) => PAD.l + ((t - tMin) / (tMax - tMin || 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - vMin) / (vMax - vMin || 1)) * (H - PAD.t - PAD.b);
  const unit = prepared[0]?.unit ?? "TRY";

  const pathFor = (s: (typeof prepared)[number]) => {
    let d = "";
    s.pts.forEach((p, i) => {
      d += i === 0 ? `M${x(p.at)},${y(p.v)}` : `H${x(p.at)}V${y(p.v)}`;
    });
    const last = s.pts[s.pts.length - 1];
    if (last) d += `H${x(s.end)}`;
    return d;
  };
  const valueAt = (s: (typeof prepared)[number], t: number) => {
    let cur: (typeof s.pts)[number] | null = null;
    for (const p of s.pts) if (p.at <= t) cur = p;
    return cur;
  };

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => vMin + ((vMax - vMin) * i) / ticks);
  const xTicks = Array.from({ length: 5 }, (_, i) => tMin + ((tMax - tMin) * i) / 4);

  return (
    <div className="card p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {series.map((s) => {
          const off = hidden.includes(s.id) || !s.points.length;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!s.points.length}
              onClick={() => setHidden((h) => (h.includes(s.id) ? h.filter((x) => x !== s.id) : [...h, s.id]))}
              className={`chip ${off ? "opacity-50" : ""}`}
              aria-pressed={!off}
            >
              <span className="inline-block size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          );
        })}
        {hasEur && (
          <label className="ml-auto flex items-center gap-2 text-xs text-fg-2">
            <input type="checkbox" checked={convert} onChange={(e) => setConvert(e.target.checked)} className="accent-[var(--accent)]" />
            EUR fiyatlarını TL&apos;ye çevir
          </label>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="Fiyat geçmişi grafiği"
        onPointerMove={(e) => {
          const rect = svgRef.current!.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          if (px < PAD.l || px > W - PAD.r) return setHover(null);
          setHover(tMin + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (tMax - tMin));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray={i === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {Math.round(v).toLocaleString("tr-TR")}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text key={i} x={x(t)} y={H - 10} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fontSize="11" fill="var(--muted)">
            {dateFmt.format(new Date(t * 1000))}
          </text>
        ))}
        {prepared.map((s) => (
          <g key={s.id}>
            <path d={pathFor(s)} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinejoin="round" />
            {s.pts.map((p, i) => (
              <circle key={i} cx={x(p.at)} cy={y(p.v)} r="3" fill={p.inStock ? s.color : "var(--surface)"} stroke={s.color} strokeWidth="1.5" />
            ))}
          </g>
        ))}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--border-strong)" strokeWidth="1" />
        )}
      </svg>
      {hover != null && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-muted">{new Date(hover * 1000).toLocaleDateString("tr-TR")}</span>
          {prepared.map((s) => {
            const p = valueAt(s, hover);
            return p ? (
              <span key={s.id} className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
                {s.label}: <span className="font-semibold">{fmtMoney(p.v, unit)}</span>
                {!p.inStock && <span className="text-warn">(stok yok)</span>}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
