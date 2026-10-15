import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { client } from "@/db";
import { mapSetRow } from "@/lib/queries/sets";
import { getPriceBadges } from "@/lib/queries/prices";
import { hrefWith } from "@/lib/url";
import { EmptyState, PageHeader } from "@/components/ui";
import { WishlistRow } from "./wishlist-row";

export const metadata: Metadata = { title: "İstek Listesi" };

const SORTS = {
  priority: { label: "Öncelik", sql: "w.priority ASC, COALESCE(s.exit_date_manual, s.exit_date) IS NULL, COALESCE(s.exit_date_manual, s.exit_date)" },
  exit: { label: "Emeklilik tarihi", sql: "COALESCE(s.exit_date_manual, s.exit_date) IS NULL, COALESCE(s.exit_date_manual, s.exit_date) ASC" },
  added: { label: "Eklenme", sql: "w.added_at DESC" },
  name: { label: "İsim", sql: "s.name COLLATE NOCASE" },
  year: { label: "Yıl", sql: "s.year DESC" },
  parts: { label: "Parça", sql: "s.num_parts DESC" },
} as const;

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ sort?: string; q?: string }> }) {
  const sp = await searchParams;
  const sort = (sp.sort && sp.sort in SORTS ? sp.sort : "priority") as keyof typeof SORTS;
  const q = (sp.q ?? "").trim();
  const res = await client.execute({
    sql: `SELECT s.set_num, s.name, s.year, s.theme_id, t.name AS theme_name, s.num_parts, s.img_url,
                 s.launch_date, s.exit_date, s.exit_date_manual,
                 (SELECT COUNT(*) FROM owned_sets o WHERE o.set_num = s.set_num) AS owned_count,
                 1 AS in_wishlist, w.priority AS wish_priority, w.note, w.added_at
          FROM wishlist w JOIN catalog_sets s ON s.set_num = w.set_num
          LEFT JOIN catalog_themes t ON t.id = s.theme_id
          ${q ? "WHERE s.name LIKE ? OR s.set_num LIKE ?" : ""}
          ORDER BY ${SORTS[sort].sql}`,
    args: q ? [`%${q}%`, `${q}%`] : [],
  });
  const items = res.rows.map((r) => ({
    set: mapSetRow(r as Record<string, unknown>),
    note: (r.note as string) ?? null,
    addedAt: Number(r.added_at),
  }));
  const prices = await getPriceBadges(items.map((i) => i.set.setNum));

  return (
    <div>
      <PageHeader title="İstek listesi" description="Almak istediğin setler. Önceliğe, emeklilik tarihine veya fiyata göre takip et." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <form action="/istek">
          {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
          <input name="q" defaultValue={q} placeholder="Listede ara…" className="input h-9 rounded-full sm:w-64" aria-label="Listede ara" />
        </form>
        <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-muted">Sırala:</span>
        {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((k) => (
          <Link key={k} href={hrefWith("/istek", sp, { sort: k === "priority" ? null : k })} className={`chip ${sort === k ? "chip-active" : ""}`}>
            {SORTS[k].label}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title={q ? "Eşleşen set yok" : "İstek listen boş"}
          action={
            <Link href="/setler?own=all" className="btn-primary">
              Kataloğa göz at
            </Link>
          }
        >
          Herhangi bir set kartındaki ☆ ile istek listesine ekleyebilirsin.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <WishlistRow key={i.set.setNum} set={i.set} note={i.note} price={prices.get(i.set.setNum) ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
