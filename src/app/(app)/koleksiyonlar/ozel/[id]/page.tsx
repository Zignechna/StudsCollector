import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { client, db, schema } from "@/db";
import { listSets, scopeProgress } from "@/lib/queries/sets";
import { OWNED_FIGS_SQL } from "@/lib/queries/collections";
import { parseSetFilters, type RawParams } from "@/lib/filters";
import { hrefWith } from "@/lib/url";
import { FilterBar } from "@/components/filter-bar";
import { SetGrid, SetList } from "@/components/set-card";
import { FigGrid } from "@/components/fig-card";
import { EmptyState, Pagination, ProgressBar, ProgressLabel } from "@/components/ui";
import { CollectionForm } from "../collection-form";
import { ItemPicker } from "./item-picker";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await db.query.customCollections.findFirst({ where: eq(schema.customCollections.id, Number(id)) });
  return { title: c?.name ?? "Özel koleksiyon" };
}

export default async function CustomCollectionPage({ params, searchParams }: Props) {
  const [{ id: raw }, sp] = await Promise.all([params, searchParams]);
  const id = Number(raw);
  const collection = Number.isFinite(id) ? await db.query.customCollections.findFirst({ where: eq(schema.customCollections.id, id) }) : null;
  if (!collection) notFound();

  const filters = parseSetFilters(sp, { sort: "year", dir: "asc" });
  const [{ sets, total, pageSize }, progress, figsRes] = await Promise.all([
    listSets({ kind: "custom", collectionId: id }, filters),
    scopeProgress({ kind: "custom", collectionId: id }),
    client.execute({
      sql: `SELECT f.fig_num, f.name, f.img_url, f.num_parts, COALESCE(o.qty, 0) AS owned_qty,
                   COALESCE((SELECT quantity FROM owned_minifigs om WHERE om.fig_num = f.fig_num), 0) AS loose_qty, 0 AS from_sets
            FROM custom_collection_items i JOIN catalog_minifigs f ON f.fig_num = i.fig_num
            LEFT JOIN (${OWNED_FIGS_SQL}) o ON o.fig_num = f.fig_num
            WHERE i.collection_id = ? ORDER BY f.name`,
      args: [id],
    }),
  ]);
  const figs = figsRes.rows.map((r) => ({
    figNum: String(r.fig_num),
    name: String(r.name),
    imgUrl: (r.img_url as string) ?? null,
    numParts: Number(r.num_parts),
    ownedQty: Number(r.owned_qty),
    looseQty: Number(r.loose_qty),
    fromSets: 0,
  }));
  const ownedFigs = figs.filter((f) => f.ownedQty > 0).length;
  const owned = progress.owned + ownedFigs;
  const all = progress.total + figs.length;
  const base = `/koleksiyonlar/ozel/${id}`;

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1 text-xs text-muted" aria-label="Konum">
        <Link href="/koleksiyonlar/ozel" className="hover:text-fg">
          Özel koleksiyonlar
        </Link>
        <ChevronRight className="size-3" />
      </nav>
      <div className="card mb-6 p-4 sm:p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Özel koleksiyon</div>
        <h1 className="page-title">{collection.name}</h1>
        {collection.description && <p className="mt-1 max-w-2xl text-sm text-fg-2">{collection.description}</p>}
        <div className="mt-3 max-w-xl space-y-2">
          <ProgressLabel owned={owned} total={all} className="text-sm" />
          <ProgressBar owned={owned} total={all} size="lg" />
          <div className="text-xs text-muted">
            {progress.owned}/{progress.total} set{figs.length ? ` · ${ownedFigs}/${figs.length} figür` : ""}
          </div>
        </div>
      </div>

      <ItemPicker collectionId={id} />

      {progress.total > 0 && (
        <section className="mb-10">
          <h2 className="section-title mb-3">Setler</h2>
          <Suspense>
            <FilterBar defaults={{ sort: "year", dir: "asc" }} hide={["themes"]} total={total} />
          </Suspense>
          {sets.length === 0 ? (
            <EmptyState title="Eşleşen set yok" />
          ) : filters.view === "list" ? (
            <SetList sets={sets} />
          ) : (
            <SetGrid sets={sets} showTheme />
          )}
          <Pagination page={filters.page} total={total} pageSize={pageSize} hrefFor={(p) => hrefWith(base, sp, { page: p === 1 ? null : p })} />
        </section>
      )}
      {figs.length > 0 && (
        <section className="mb-10">
          <h2 className="section-title mb-3">Figürler</h2>
          <FigGrid figs={figs} />
        </section>
      )}
      {all === 0 && <EmptyState title="Koleksiyon boş">Yukarıdan set veya figür arayıp ekle.</EmptyState>}

      <details className="mt-10">
        <summary className="cursor-pointer text-sm font-semibold text-fg-2 hover:text-fg">Koleksiyonu düzenle</summary>
        <div className="mt-3 max-w-xl">
          <CollectionForm initial={{ id, name: collection.name, description: collection.description, coverImg: collection.coverImg }} />
        </div>
      </details>
    </div>
  );
}
