import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Boxes, Plus } from "lucide-react";
import { listSets } from "@/lib/queries/sets";
import { getThemeTree } from "@/lib/queries/themes";
import { themeOptions } from "@/lib/queries/theme-options";
import { parseSetFilters, type RawParams } from "@/lib/filters";
import { hrefWith } from "@/lib/url";
import { FilterBar } from "@/components/filter-bar";
import { SetGrid, SetList } from "@/components/set-card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";

export const metadata: Metadata = { title: "Setlerim" };

export default async function SetsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const defaults = { own: "owned" as const, sort: "added" as const, dir: "desc" as const };
  const filters = parseSetFilters(sp, defaults);
  const [{ sets, total, pageSize }, tree] = await Promise.all([listSets({ kind: "all" }, filters), getThemeTree()]);
  const browsingCatalog = filters.own !== "owned";

  return (
    <div>
      <PageHeader
        title={browsingCatalog ? "Katalog" : "Setlerim"}
        description={
          browsingCatalog
            ? "Tüm LEGO katalogunda ara. Sahip olmadıkların kilitli görünür."
            : "Sahip olduğun setler. Sahiplik filtresini değiştirerek tüm kataloğa göz atabilirsin."
        }
        actions={
          <>
            <Link href={browsingCatalog ? "/setler" : "/setler?own=all"} className="btn-secondary">
              {browsingCatalog ? "Sadece setlerim" : "Tüm katalog"}
            </Link>
            <Link href="/ekle" className="btn-primary">
              <Plus className="size-4" /> Set ekle
            </Link>
          </>
        }
      />
      <Suspense>
        <FilterBar themes={themeOptions(tree)} defaults={defaults} total={total} />
      </Suspense>
      {sets.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title={filters.own === "owned" && !filters.q ? "Henüz set yok" : "Sonuç yok"}
          action={
            <Link href="/ekle" className="btn-primary">
              <Plus className="size-4" /> Set ekle
            </Link>
          }
        >
          {filters.own === "owned" ? "Koleksiyonuna set ekleyerek başla." : "Filtreleri değiştirerek tekrar dene."}
        </EmptyState>
      ) : filters.view === "list" ? (
        <SetList sets={sets} />
      ) : (
        <SetGrid sets={sets} showTheme />
      )}
      <Pagination page={filters.page} total={total} pageSize={pageSize} hrefFor={(p) => hrefWith("/setler", sp, { page: p === 1 ? null : p })} />
    </div>
  );
}
