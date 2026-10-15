"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, FolderPlus, Plus, Star } from "lucide-react";
import { toggleCollectionItem, toggleWishlist } from "@/app/actions/collection";
import { AddSetDialog } from "@/components/add-set-dialog";
import { toastResult } from "@/components/toast";

export function SetActions({
  setNum,
  name,
  ownedCount,
  inWishlist,
  collections,
}: {
  setNum: string;
  name: string;
  ownedCount: number;
  inWishlist: boolean;
  collections: { id: number; name: string; member: boolean }[];
}) {
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button type="button" className="btn-primary h-11" onClick={() => setDialog(true)}>
        <Plus className="size-4" />
        {ownedCount > 0 ? "Bir kopya daha ekle" : "Koleksiyona ekle"}
      </button>
      {ownedCount > 0 && (
        <span className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-good-soft px-3 text-sm font-semibold text-good">
          <Check className="size-4" /> Koleksiyonda{ownedCount > 1 ? ` ×${ownedCount}` : ""}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        className={`btn h-11 border ${inWishlist ? "border-info bg-info-soft text-info" : "border-line bg-surface-2 text-fg hover:bg-surface-3"}`}
        onClick={() => start(async () => toastResult(await toggleWishlist(setNum)))}
      >
        <Star className={`size-4 ${inWishlist ? "fill-current" : ""}`} />
        {inWishlist ? "İstek listesinde" : "İstek listesine ekle"}
      </button>
      <div className="relative" ref={ref}>
        <button type="button" className="btn-secondary h-11" onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
          <FolderPlus className="size-4" /> Özel koleksiyon
        </button>
        {menu && (
          <div className="absolute left-0 top-12 z-30 w-64 rounded-xl border border-line bg-surface p-2 shadow-card">
            {collections.length === 0 && <p className="px-2 py-2 text-sm text-muted">Henüz özel koleksiyon yok.</p>}
            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={pending}
                onClick={() => start(async () => toastResult(await toggleCollectionItem(c.id, { setNum })))}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className={`flex size-4 items-center justify-center rounded border ${c.member ? "border-accent bg-accent text-accent-ink" : "border-line-strong"}`}>
                  {c.member && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            <Link href="/koleksiyonlar/ozel/yeni" className="mt-1 block rounded-md px-2 py-2 text-sm font-semibold text-accent hover:bg-surface-2">
              + Yeni özel koleksiyon
            </Link>
          </div>
        )}
      </div>
      {dialog && <AddSetDialog setNum={setNum} name={name} onClose={() => setDialog(false)} />}
    </div>
  );
}
