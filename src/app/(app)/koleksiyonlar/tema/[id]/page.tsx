import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, CircleUserRound } from "lucide-react";
import { getThemeTree } from "@/lib/queries/themes";
import { listSets } from "@/lib/queries/sets";
import { themeOptions } from "@/lib/queries/theme-options";
import { parseSetFilters, type RawParams } from "@/lib/filters";
import { hrefWith } from "@/lib/url";
import { CollectionCard } from "@/components/collection-card";
import { FilterBar } from "@/components/filter-bar";
import { SetGrid, SetList } from "@/components/set-card";
import { EmptyState, Pagination, ProgressBar, ProgressLabel } from "@/components/ui";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tree = await getThemeTree();
  return { title: tree.nodes.get(Number(id))?.name ?? "Tema" };
}

export default async function ThemePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tree = await getThemeTree();
  const theme = tree.nodes.get(Number(id));
  if (!theme) notFound();

  const filters = parseSetFilters(sp, { sort: "year", dir: "desc" });
  const { sets, total, pageSize } = await listSets({ kind: "theme", themeId: theme.id }, filters);
  const path = tree.path(theme.id);
  const children = theme.children.map((c) => tree.nodes.get(c)!).filter((c) => c.total > 0);
  const options = themeOptions(tree, theme.children.length ? theme.children : []);
  const base = `/koleksiyonlar/tema/${theme.id}`;

  return (
    <div>
      <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted" aria-label="Konum">
        <Link href="/koleksiyonlar" className="hover:text-fg">
          Koleksiyonlar
        </Link>
        {path.slice(0, -1).map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            <Link href={`/koleksiyonlar/tema/${p.id}`} className="hover:text-fg">
              {p.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="card mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          {theme.coverImg && (
            <div className="hidden h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-tile sm:block">
              <img src={theme.coverImg} alt="" className="h-full w-full object-contain p-2" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 lang="en" className="page-title">{theme.name}</h1>
            <div className="mt-3 max-w-xl space-y-2">
              <ProgressLabel owned={theme.owned} total={theme.total} className="text-sm" />
              <ProgressBar owned={theme.owned} total={theme.total} size="lg" />
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {theme.wished > 0 && <span className="text-info">{theme.wished} set istek listesinde</span>}
                <Link href={`/figurler?theme=${theme.id}`} className="inline-flex items-center gap-1 hover:text-fg">
                  <CircleUserRound className="size-3.5" /> Bu temanın minifigürleri
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {children.length > 0 && (
        <section className="mb-8">
          <h2 className="section-title mb-3">Alt temalar</h2>
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4 xl:grid-cols-5">
            {children
              .sort((a, b) => b.owned - a.owned || b.total - a.total)
              .map((c) => (
                <div key={c.id} className="w-56 shrink-0 snap-start md:w-auto">
                  <CollectionCard
                    href={`/koleksiyonlar/tema/${c.id}`}
                    name={c.name}
                    owned={c.owned}
                    total={c.total}
                    wished={c.wished}
                    coverImg={c.coverImg}
                    eyebrow={c.children.length ? `${c.children.length} alt tema` : undefined}
                  />
                </div>
              ))}
          </div>
        </section>
      )}

      <h2 className="section-title mb-3">Tüm setler</h2>
      <Suspense>
        <FilterBar themes={options} defaults={{ sort: "year", dir: "desc" }} hide={options.length ? [] : ["themes"]} total={total} />
      </Suspense>
      {sets.length === 0 ? (
        <EmptyState title="Set bulunamadı">Filtreleri değiştirerek tekrar dene.</EmptyState>
      ) : filters.view === "list" ? (
        <SetList sets={sets} />
      ) : (
        <SetGrid sets={sets} />
      )}
      <Pagination page={filters.page} total={total} pageSize={pageSize} hrefFor={(p) => hrefWith(base, sp, { page: p === 1 ? null : p })} />
    </div>
  );
}
