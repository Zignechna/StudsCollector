import type { Metadata } from "next";
import Link from "next/link";
import { Blocks, Plus } from "lucide-react";
import { listCustomCollections } from "@/lib/queries/collections";
import { getThemeTree } from "@/lib/queries/themes";
import { CollectionCard } from "@/components/collection-card";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";

export const metadata: Metadata = { title: "Özel Koleksiyonlar" };

export default async function CustomCollectionsPage() {
  const [custom, tree] = await Promise.all([listCustomCollections(), getThemeTree()]);
  return (
    <div>
      <PageHeader
        title="Koleksiyonlar"
        description="Katalogda tek bir tema olarak geçmeyen seriler için kendi koleksiyonlarını oluştur (ör. Marvel Modular binaları)."
        actions={
          <Link href="/koleksiyonlar/ozel/yeni" className="btn-primary">
            <Plus className="size-4" /> Yeni özel koleksiyon
          </Link>
        }
      />
      <Tabs
        active="custom"
        items={[
          { key: "themes", label: "Temalar", href: "/koleksiyonlar", count: tree.roots.filter((r) => r.total > 0).length },
          { key: "custom", label: "Özel koleksiyonlar", href: "/koleksiyonlar/ozel", count: custom.length },
        ]}
      />
      {custom.length === 0 ? (
        <EmptyState
          icon={<Blocks />}
          title="Henüz özel koleksiyon yok"
          action={
            <Link href="/koleksiyonlar/ozel/yeni" className="btn-primary">
              <Plus className="size-4" /> Oluştur
            </Link>
          }
        >
          Örneğin &quot;Marvel Modular&quot; adında bir koleksiyon oluşturup Sanctum Sanctorum, Daily Bugle ve Avengers Tower setlerini ekleyebilirsin.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {custom.map((c) => (
            <CollectionCard
              key={c.id}
              href={`/koleksiyonlar/ozel/${c.id}`}
              nameLang="tr"
              name={c.name}
              owned={c.ownedSets + c.ownedFigs}
              total={c.totalSets + c.totalFigs}
              coverImg={c.coverImg}
              eyebrow={[c.totalSets ? `${c.totalSets} set` : null, c.totalFigs ? `${c.totalFigs} figür` : null].filter(Boolean).join(" · ") || "Boş"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
