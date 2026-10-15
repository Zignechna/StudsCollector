import Link from "next/link";
import { Boxes, Clock, Plus } from "lucide-react";
import { getThemeTree } from "@/lib/queries/themes";
import { getDashboardStats, getRecentlyAdded, getRetiringSoon } from "@/lib/queries/stats";
import { listCustomCollections } from "@/lib/queries/collections";
import { fmtNum, pct } from "@/lib/format";
import { CollectionCard } from "@/components/collection-card";
import { SetGrid } from "@/components/set-card";
import { EmptyState, SectionHeader, StatTile } from "@/components/ui";

export default async function HomePage() {
  const [stats, tree, recent, retiring, custom] = await Promise.all([
    getDashboardStats(),
    getThemeTree(),
    getRecentlyAdded(12),
    getRetiringSoon(183, 12),
    listCustomCollections(),
  ]);

  // Most progressed collections across all theme levels (+ custom collections).
  const themeProgress = [...tree.nodes.values()]
    .filter((n) => n.owned > 0 && n.total > 1)
    .map((n) => ({
      key: `t${n.id}`,
      href: `/koleksiyonlar/tema/${n.id}`,
      name: n.name,
      eyebrow: n.parentId != null ? tree.path(n.id).slice(0, -1).map((p) => p.name).join(" › ") : "Tema",
      nameLang: "en",
      owned: n.owned,
      total: n.total,
      wished: n.wished,
      coverImg: n.coverImg,
    }));
  const customProgress = custom
    .filter((c) => c.totalSets > 0)
    .map((c) => ({
      key: `c${c.id}`,
      href: `/koleksiyonlar/ozel/${c.id}`,
      name: c.name,
      eyebrow: "Özel koleksiyon",
      nameLang: "tr",
      owned: c.ownedSets,
      total: c.totalSets,
      wished: 0,
      coverImg: c.coverImg,
    }));
  const top = [...customProgress, ...themeProgress]
    .sort((a, b) => pct(b.owned, b.total) - pct(a.owned, a.total) || b.owned - a.owned)
    .slice(0, 8);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Koleksiyonun</div>
            <h1 className="page-title">Hoş geldin</h1>
          </div>
          <Link href="/ekle" className="btn-primary md:hidden">
            <Plus className="size-4" /> Set ekle
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Set" value={fmtNum(stats.distinctSets)} sub={stats.copies !== stats.distinctSets ? `${fmtNum(stats.copies)} kopya` : "farklı set"} href="/setler" />
          <StatTile label="Parça" value={fmtNum(stats.parts)} sub="setlerden" href="/parcalar" />
          <StatTile label="Minifigür" value={fmtNum(stats.minifigs)} href="/figurler" />
          <StatTile label="İstek listesi" value={fmtNum(stats.wishlist)} href="/istek" />
          <StatTile label="Eksik parça" value={fmtNum(stats.missing)} href="/eksikler" />
          <StatTile label="Katalog" value={fmtNum(stats.catalogSets)} sub="set" href="/koleksiyonlar" />
        </div>
      </section>

      {stats.copies === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="Koleksiyonun boş"
          action={
            <Link href="/ekle" className="btn-primary">
              <Plus className="size-4" /> İlk setini ekle
            </Link>
          }
        >
          Set numarasıyla (ör. 10300) arayıp ekle. Tüm temalardaki ilerlemen burada görünür.
        </EmptyState>
      ) : (
        <>
          {top.length > 0 && (
            <section>
              <SectionHeader title="En çok ilerlenen koleksiyonlar" href="/koleksiyonlar" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {top.map(({ key, ...c }) => (
                  <CollectionCard key={key} {...c} />
                ))}
              </div>
            </section>
          )}

          {retiring.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-5 text-warn" />
                <h2 className="section-title">Yakında emekli olacaklar</h2>
              </div>
              <SetGrid sets={retiring} />
            </section>
          )}

          <section>
            <SectionHeader title="Son eklenenler" href="/setler?sort=added" />
            <SetGrid sets={recent} showTheme />
          </section>
        </>
      )}
    </div>
  );
}
