import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CircleUserRound } from "lucide-react";
import { getThemeTree } from "@/lib/queries/themes";
import { CMF_THEME_ID, FIG_PAGE_SIZE, figProgressForThemes, listFigs } from "@/lib/queries/minifigs";
import { hrefWith } from "@/lib/url";
import { CollectionCard } from "@/components/collection-card";
import { FigGrid } from "@/components/fig-card";
import { EmptyState, PageHeader, Pagination, ProgressBar, ProgressLabel, Tabs } from "@/components/ui";

export const metadata: Metadata = { title: "Minifigürler" };

type Params = { view?: string; theme?: string; q?: string; own?: string; sort?: string; page?: string };

export default async function MinifigsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const tree = await getThemeTree();
  const themeId = sp.theme ? Number(sp.theme) : null;
  const theme = themeId != null ? tree.nodes.get(themeId) : undefined;
  const view = theme ? "theme" : sp.view === "cmf" ? "cmf" : "mine";
  const q = (sp.q ?? "").trim();
  const own = sp.own === "owned" || sp.own === "notowned" ? sp.own : null;
  const sort = sp.sort === "number" || sp.sort === "owned" ? sp.sort : "name";
  const page = Math.max(1, Number(sp.page) || 1);

  const tabs = (
    <Tabs
      active={view}
      items={[
        { key: "mine", label: "Koleksiyonum", href: "/figurler" },
        { key: "cmf", label: "CMF serileri", href: "/figurler?view=cmf" },
        ...(theme ? [{ key: "theme", label: theme.name, href: `/figurler?theme=${theme.id}` }] : []),
      ]}
    />
  );

  const toolbar = (
    <form className="mb-5 flex flex-wrap items-center gap-2" action="/figurler">
      {theme && <input type="hidden" name="theme" value={theme.id} />}
      {view === "cmf" && <input type="hidden" name="view" value="cmf" />}
      <input name="q" defaultValue={q} placeholder="Figür adı veya numarası…" className="input h-9 rounded-full sm:w-72" aria-label="Figür ara" />
      {view !== "mine" &&
        (
          [
            [null, "Tümü"],
            ["owned", "Sahip olduklarım"],
            ["notowned", "Eksikler"],
          ] as const
        ).map(([k, label]) => (
          <Link key={label} href={hrefWith("/figurler", sp, { own: k, page: null })} className={`chip ${own === k ? "chip-active" : ""}`}>
            {label}
          </Link>
        ))}
      <select name="sort" defaultValue={sort} className="input h-8 w-auto rounded-full py-0 text-xs font-semibold" aria-label="Sıralama">
        <option value="name">İsim</option>
        <option value="number">Figür no</option>
        <option value="owned">Sahip olunan adet</option>
      </select>
      <button className="btn-secondary btn-sm">Uygula</button>
    </form>
  );

  if (view === "cmf") {
    const cmf = tree.nodes.get(CMF_THEME_ID);
    const series = (cmf?.children ?? []).map((id) => tree.nodes.get(id)!).filter((s) => s.total > 0);
    const progress = await figProgressForThemes(series.map((s) => ({ id: s.id, themeIds: tree.subtree(s.id) })));
    const sorted = series
      .map((s) => ({ s, p: progress.get(s.id) ?? { total: 0, owned: 0, cover: null } }))
      .filter((x) => x.p.total > 0 && (!q || x.s.name.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr"))))
      .sort((a, b) => b.p.owned - a.p.owned || b.s.id - a.s.id);
    const totalOwned = sorted.reduce((a, x) => a + x.p.owned, 0);
    const totalAll = sorted.reduce((a, x) => a + x.p.total, 0);
    return (
      <div>
        <PageHeader title="Minifigürler" description="Collectible Minifigures serileri — her seri için toplama ilerlemen." />
        {tabs}
        <div className="card mb-6 max-w-xl space-y-2 p-4">
          <ProgressLabel owned={totalOwned} total={totalAll} className="text-sm" />
          <ProgressBar owned={totalOwned} total={totalAll} />
        </div>
        {sorted.length === 0 ? (
          <EmptyState icon={<CircleUserRound />} title="CMF verisi yok">
            CMF serileri katalog aktarımıyla gelir. `npm run catalog:import` çalıştığında burada görünür.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sorted.map(({ s, p }) => (
              <CollectionCard key={s.id} href={`/figurler?theme=${s.id}`} name={s.name} owned={p.owned} total={p.total} coverImg={p.cover} eyebrow="CMF" />
            ))}
          </div>
        )}
      </div>
    );
  }

  const scope = theme ? ({ kind: "themes", themeIds: tree.subtree(theme.id) } as const) : ({ kind: "owned" } as const);
  const { figs, total, owned } = await listFigs({ scope, q, own, sort, page });
  const progress = theme ? (await figProgressForThemes([{ id: theme.id, themeIds: tree.subtree(theme.id) }])).get(theme.id) : null;
  const path = theme ? tree.path(theme.id) : [];

  return (
    <div>
      <PageHeader
        title={theme ? <span lang="en">{theme.name}</span> : "Minifigürler"}
        eyebrow={
          theme ? (
            <span className="flex flex-wrap items-center gap-1 normal-case">
              <Link href="/figurler" className="hover:text-fg">
                Minifigürler
              </Link>
              {path.slice(0, -1).map((p) => (
                <span key={p.id} className="flex items-center gap-1">
                  <ChevronRight className="size-3" />
                  <Link href={`/figurler?theme=${p.id}`} className="hover:text-fg">
                    {p.name}
                  </Link>
                </span>
              ))}
            </span>
          ) : undefined
        }
        description={
          theme
            ? "Bu temanın setlerinden çıkan tüm figürler. Sahip olmadıkların kilitli görünür."
            : "Setlerinden gelen figürler otomatik eklenir. Tek figürleri (CMF paketi vb.) + ile ekleyebilirsin."
        }
        actions={
          theme ? (
            <Link href={`/koleksiyonlar/tema/${theme.id}`} className="btn-secondary">
              Temanın setleri
            </Link>
          ) : undefined
        }
      />
      {tabs}
      {progress && (
        <div className="card mb-6 max-w-xl space-y-2 p-4">
          <ProgressLabel owned={progress.owned} total={progress.total} className="text-sm" />
          <ProgressBar owned={progress.owned} total={progress.total} />
        </div>
      )}
      {toolbar}
      <p className="mb-3 text-xs text-muted">
        <span className="font-semibold text-fg">{total.toLocaleString("tr-TR")}</span> figür{!theme ? "" : ` · ${owned} sahip olunan`}
      </p>
      {figs.length === 0 ? (
        <EmptyState icon={<CircleUserRound />} title={theme ? "Figür bulunamadı" : "Henüz figür yok"}>
          {theme ? "Bu temanın figür verisi yok veya filtre eşleşmedi." : "Set ekledikçe içindeki figürler burada görünür. CMF serilerine göz at."}
        </EmptyState>
      ) : (
        <FigGrid figs={figs} />
      )}
      <Pagination page={page} total={total} pageSize={FIG_PAGE_SIZE} hrefFor={(p) => hrefWith("/figurler", sp, { page: p === 1 ? null : p })} />
    </div>
  );
}
