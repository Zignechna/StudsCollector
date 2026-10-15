"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Blocks,
  Boxes,
  CircleUserRound,
  Home,
  LayoutGrid,
  Menu,
  PackageX,
  Plus,
  Puzzle,
  Search,
  Settings,
  Star,
  Tag,
  X,
} from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export const NAV_ITEMS = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/koleksiyonlar", label: "Koleksiyonlar", icon: LayoutGrid },
  { href: "/setler", label: "Setlerim", icon: Boxes },
  { href: "/figurler", label: "Figürler", icon: CircleUserRound },
  { href: "/parcalar", label: "Parçalar", icon: Puzzle },
  { href: "/eksikler", label: "Eksikler", icon: PackageX },
  { href: "/istek", label: "İstek Listesi", icon: Star },
  { href: "/fiyat", label: "Fiyat Takibi", icon: Tag },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function GlobalSearch({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        router.push(`/setler?own=all&q=${encodeURIComponent(q.trim())}`);
        setQ("");
        onDone?.();
      }}
      className="relative w-full"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Set adı veya numarası ara…"
        aria-label="Set ara"
        className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-accent focus:bg-white/10"
      />
    </form>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-header/95 backdrop-blur supports-[backdrop-filter]:bg-header/85">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 lg:px-6">
        <Link href="/" className="shrink-0" aria-label="StudsCollector ana sayfa">
          <Logo />
        </Link>
        <div className="mx-2 hidden max-w-md flex-1 md:block">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="inline-flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Ara"
            onClick={() => setSearchOpen((v) => !v)}
          >
            {searchOpen ? <X className="size-[18px]" /> : <Search className="size-[18px]" />}
          </button>
          <ThemeToggle />
          <Link
            href="/ayarlar"
            className="inline-flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Ayarlar"
            title="Ayarlar"
          >
            <Settings className="size-[18px]" />
          </Link>
          <Link href="/ekle" className="btn-primary ml-1 hidden h-9 md:inline-flex">
            <Plus className="size-4" /> Set Ekle
          </Link>
        </div>
      </div>
      {searchOpen && (
        <div className="px-4 pb-3 md:hidden">
          <GlobalSearch onDone={() => setSearchOpen(false)} />
        </div>
      )}
      <nav className="hidden border-t border-white/5 md:block" aria-label="Ana menü">
        <ul className="scrollbar-none mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-4 lg:px-6">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative flex h-11 items-center px-3 text-[13px] font-semibold uppercase tracking-wide transition-colors ${
                    active ? "text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {label}
                  {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

const MOBILE_TABS = [
  { href: "/", label: "Ana Sayfa", icon: Home, primary: false },
  { href: "/koleksiyonlar", label: "Koleksiyon", icon: LayoutGrid, primary: false },
  { href: "/ekle", label: "Ekle", icon: Plus, primary: true },
  { href: "/setler", label: "Setlerim", icon: Boxes, primary: false },
] as const;

const MENU_ITEMS = [
  ...NAV_ITEMS,
  { href: "/koleksiyonlar/ozel", label: "Özel Seriler", icon: Blocks },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const moreActive = !MOBILE_TABS.some((t) => isActive(pathname, t.href));
  return (
    <>
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-header/95 backdrop-blur md:hidden"
        aria-label="Alt menü"
      >
        <ul className="grid h-16 grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            if (tab.primary) {
              return (
                <li key={tab.href} className="flex items-center justify-center">
                  <Link
                    href={tab.href}
                    aria-label={tab.label}
                    className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-black/40 active:scale-95"
                  >
                    <Icon className="size-6" strokeWidth={2.5} />
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
                    active ? "text-accent" : "text-white/55"
                  }`}
                >
                  <Icon className="size-5" />
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMenuOpen(true)}
              className={`flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
                moreActive ? "text-accent" : "text-white/55"
              }`}
            >
              <Menu className="size-5" />
              Menü
            </button>
          </li>
        </ul>
      </nav>
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button className="absolute inset-0 bg-black/60" aria-label="Kapat" onClick={() => setMenuOpen(false)} />
          <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface p-4">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-3" />
            <ul className="grid grid-cols-3 gap-2 pb-2">
              {MENU_ITEMS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-semibold ${
                      isActive(pathname, href) ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface-2 text-fg-2"
                    }`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
