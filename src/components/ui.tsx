import Link from "next/link";
import type { ReactNode } from "react";
import { pct } from "@/lib/format";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</div>}
        <h1 className="page-title text-balance">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-fg-2">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ProgressBar({ owned, total, size = "md" }: { owned: number; total: number; size?: "sm" | "md" | "lg" }) {
  const p = pct(owned, total);
  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-surface-3`} role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full ${p === 100 ? "bg-good" : "bg-accent"} transition-[width] duration-500`}
        style={{ width: `${Math.max(p, owned > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

/** "3 / 4 toplandı — %75" */
export function ProgressLabel({ owned, total, className = "" }: { owned: number; total: number; className?: string }) {
  const p = pct(owned, total);
  return (
    <div className={`flex items-baseline justify-between gap-2 text-xs ${className}`}>
      <span className="font-semibold text-fg">
        <span className="tabular-nums">{owned}</span>
        <span className="text-muted"> / </span>
        <span className="tabular-nums">{total}</span>
        <span className="font-normal text-muted"> toplandı</span>
      </span>
      <span className={`font-display text-base font-bold tabular-nums ${p === 100 ? "text-good" : "text-accent"}`}>%{p}</span>
    </div>
  );
}

export function StatTile({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold tabular-nums text-fg">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 transition hover:border-line-strong">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted [&_svg]:size-10">{icon}</div>}
      <h3 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-fg-2">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, href, linkLabel = "Tümü" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="section-title">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-semibold uppercase tracking-wide text-accent hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function Pagination({ page, total, pageSize, hrefFor }: { page: number; total: number; pageSize: number; hrefFor: (p: number) => string }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const list = [...nums].sort((a, b) => a - b);
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="Sayfalar">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="btn-secondary btn-sm">
          ← Önceki
        </Link>
      )}
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && list[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={`btn-sm btn ${p === page ? "bg-accent text-accent-ink" : "bg-surface-2 text-fg-2 hover:bg-surface-3"} min-w-8`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={hrefFor(page + 1)} className="btn-secondary btn-sm">
          Sonraki →
        </Link>
      )}
    </nav>
  );
}

export function Tabs({ items, active }: { items: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <div className="scrollbar-none -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`relative flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition-colors ${
            active === t.key ? "text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {t.label}
          {t.count != null && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] tabular-nums text-fg-2">{t.count}</span>}
          {active === t.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
        </Link>
      ))}
    </div>
  );
}

export function ColorSwatch({ rgb, isTrans, className = "size-4" }: { rgb: string; isTrans?: boolean; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-black/20 ${className}`}
      style={{ background: `#${rgb}`, opacity: isTrans ? 0.65 : 1 }}
      aria-hidden
    />
  );
}
