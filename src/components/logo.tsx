export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="4" y="18" width="56" height="40" rx="7" fill="#f5b800" />
      <rect x="12" y="8" width="16" height="14" rx="4" fill="#f5b800" />
      <rect x="36" y="8" width="16" height="14" rx="4" fill="#f5b800" />
      <rect x="12" y="8" width="16" height="5" rx="2.5" fill="#ffd24d" />
      <rect x="36" y="8" width="16" height="5" rx="2.5" fill="#ffd24d" />
      <rect x="4" y="18" width="56" height="7" rx="3.5" fill="#ffd24d" opacity=".7" />
      <path d="M18 34h28v6H18z" fill="#1b1500" opacity=".85" />
      <path d="M18 44h18v6H18z" fill="#1b1500" opacity=".85" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className="size-7" />
      <span className="font-display text-xl font-bold uppercase tracking-wider text-white">
        Studs<span className="text-accent">Collector</span>
      </span>
    </span>
  );
}
