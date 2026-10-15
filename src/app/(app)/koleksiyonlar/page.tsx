import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getThemeTree } from "@/lib/queries/themes";
import { listCustomCollections } from "@/lib/queries/collections";
import { pct } from "@/lib/format";
import { CollectionCard } from "@/components/collection-card";
import { PageHeader, SectionHeader, Tabs } from "@/components/ui";
import { hrefWith } from "@/lib/url";

export const metadata: Metadata = { title: "Koleksiyonlar" };

type Params = { q?: string; show?: string; sort?: string };

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [tree, custom] = await Promise.all([getThemeTree(), listCustomCollections()]);
  const q = (params.q ?? "").trim().toLocaleLowerCase("tr");
  const show = params.show === "all" ? "all" : params.show === "started" ? "started" : "default";
  const sort = params.sort === "name" || params.sort === "size" ? params.sort : "progress";

  let roots = tree.roots.filter((r) => r.total > 0);
  if (q) {
    // match any theme in the tree; show matching subthemes as their own cards
    roots = [...tree.nodes.values()].filter((n) => n.total > 0 && n.name.toLocaleLowerCase("tr").includes(q));
  }
  if (show === "started") roots = roots.filter((r) => r.owned > 0 || r.wished > 0);
  roots.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "tr");
    if (sort === "size") return b.total - a.total;
    return pct(b.owned, b.total) - pct(a.owned, a.total) || b.owned - a.owned || b.total - a.total;
  });

  const started = roots.filter((r) => r.owned > 0);
  const rest = roots.filter((r) => r.owned === 0);

  const chip = (key: string, label: string, patch: Record<string, string | null>) => {
    const active = (patch.show !== undefined && (patch.show ?? "default") === show) || (patch.sort !== undefined && (patch.sort ?? "progress") === sort);
    return (
      <Link key={key} href={hrefWith("/koleksiyonlar", params, patch)} className={`chip ${active ? "chip-active" : ""}`}>
        {label}
      </Link>
    );
  };

  return (
    <div>
      <PageHeader
        title="Koleksiyonlar"
        description="Her tema ve alt tema için toplama ilerlemen. Sahip olmadığın setler kilitli görünür."
        actions={
          <Link href="/koleksiyonlar/ozel/yeni" className="btn-secondary">
            <Plus className="size-4" /> Özel koleksiyon
          </Link>
        }
      />
      <Tabs
        active="themes"
        items={[
          { key: "themes", label: "Temalar", href: "/koleksiyonlar", count: tree.roots.filter((r) => r.total > 0).length },
          { key: "custom", label: "Özel koleksiyonlar", href: "/koleksiyonlar/ozel", count: custom.length },
        ]}
      />
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/koleksiyonlar">
        <input name="q" defaultValue={params.q} placeholder="Tema ara (ör. Marvel, Star Wars)…" className="input h-9 rounded-full sm:w-72" />
        {params.show && <input type="hidden" name="show" value={params.show} />}
        <div className="flex flex-wrap gap-1.5">
          {chip("s1", "Başladıklarım", { show: "started" })}
          {chip("s2", "Tümü", { show: null })}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          {chip("o1", "İlerleme", { sort: null })}
          {chip("o2", "İsim", { sort: "name" })}
          {chip("o3", "Set sayısı", { sort: "size" })}
        </div>
      </form>

      {started.length > 0 && (
        <section className="mb-10">
          <SectionHeader title={q ? "Başladıkların" : "Toplamaya başladıkların"} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {started.map((n) => (
              <CollectionCard
                key={n.id}
                href={`/koleksiyonlar/tema/${n.id}`}
                name={n.name}
                owned={n.owned}
                total={n.total}
                wished={n.wished}
                coverImg={n.coverImg}
                eyebrow={n.parentId != null ? tree.path(n.id)[0]?.name : `${n.children.length} alt tema`}
              />
            ))}
          </div>
        </section>
      )}
      {show !== "started" && rest.length > 0 && (
        <section>
          <SectionHeader title={started.length ? "Diğer temalar" : "Temalar"} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rest.map((n) => (
              <CollectionCard
                key={n.id}
                href={`/koleksiyonlar/tema/${n.id}`}
                name={n.name}
                owned={n.owned}
                total={n.total}
                wished={n.wished}
                coverImg={n.coverImg}
                eyebrow={n.parentId != null ? tree.path(n.id)[0]?.name : n.children.length ? `${n.children.length} alt tema` : "Tema"}
              />
            ))}
          </div>
        </section>
      )}
      {roots.length === 0 && <p className="text-sm text-muted">Eşleşen tema yok.</p>}
    </div>
  );
}
