import type { Metadata } from "next";
import { Puzzle } from "lucide-react";
import { client } from "@/db";
import { listPool, POOL_PAGE_SIZE, poolFacets, type PoolKind } from "@/lib/queries/parts";
import { expandImg } from "@/lib/images";
import { fmtNum } from "@/lib/format";
import { hrefWith } from "@/lib/url";
import { EmptyState, PageHeader, Pagination, Tabs } from "@/components/ui";
import { PoolGrid } from "./pool-grid";
import { LoosePartsPanel } from "./loose-parts";

export const metadata: Metadata = { title: "Parça Envanteri" };

type Params = { pool?: string; q?: string; color?: string; category?: string; sort?: string; page?: string };

export default async function PartsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const kind: PoolKind = sp.pool === "surplus" ? "surplus" : "total";
  const filters = {
    q: (sp.q ?? "").trim(),
    color: sp.color ? Number(sp.color) : null,
    category: sp.category ? Number(sp.category) : null,
    sort: (sp.sort === "name" || sp.sort === "color" ? sp.sort : "qty") as "qty" | "name" | "color",
    page: Math.max(1, Number(sp.page) || 1),
  };
  const [{ rows, lots, pieces }, facets, totalPool, surplusPool, loose, colors] = await Promise.all([
    listPool(kind, filters),
    poolFacets(kind),
    listPool("total", { q: "", color: null, category: null, sort: "qty", page: 1 }),
    listPool("surplus", { q: "", color: null, category: null, sort: "qty", page: 1 }),
    client.execute(`SELECT l.id, l.part_num, l.color_id, l.quantity, l.note, COALESCE(p.name, l.part_num) AS part_name,
                           COALESCE(c.name, '?') AS color_name, COALESCE(c.rgb,'CCCCCC') AS rgb, img.img_url
                    FROM loose_parts l LEFT JOIN catalog_parts p ON p.part_num = l.part_num
                    LEFT JOIN catalog_colors c ON c.id = l.color_id
                    LEFT JOIN part_images img ON img.part_num = l.part_num AND img.color_id = l.color_id
                    ORDER BY l.created_at DESC`),
    client.execute("SELECT id, name, rgb FROM catalog_colors WHERE id >= 0 ORDER BY name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Parça envanteri"
        description="Toplam havuz: setlerindeki tüm parçalar (yedekler dahil) − eksikler + gevşek parçalar. Fazlalık havuzu: yedek parçalar + seçtiğin moda göre artanlar + gevşek parçalar."
      />
      <Tabs
        active={kind}
        items={[
          { key: "total", label: "Toplam havuz", href: "/parcalar", count: totalPool.pieces },
          { key: "surplus", label: "Fazlalık havuzu", href: "/parcalar?pool=surplus", count: surplusPool.pieces },
        ]}
      />

      <form action="/parcalar" className="mb-4 flex flex-wrap items-center gap-2">
        {kind === "surplus" && <input type="hidden" name="pool" value="surplus" />}
        <input name="q" defaultValue={filters.q} placeholder="Parça adı veya numarası…" className="input h-9 rounded-full sm:w-64" aria-label="Parça ara" />
        <select name="color" defaultValue={filters.color ?? ""} className="input h-9 w-auto rounded-full text-xs" aria-label="Renk">
          <option value="">Tüm renkler</option>
          {facets.colors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.n})
            </option>
          ))}
        </select>
        <select name="category" defaultValue={filters.category ?? ""} className="input h-9 w-auto max-w-56 rounded-full text-xs" aria-label="Kategori">
          <option value="">Tüm kategoriler</option>
          {facets.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.n})
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={filters.sort} className="input h-9 w-auto rounded-full text-xs" aria-label="Sıralama">
          <option value="qty">Adet</option>
          <option value="name">İsim</option>
          <option value="color">Renk</option>
        </select>
        <button className="btn-secondary btn-sm h-9">Filtrele</button>
      </form>

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="font-display text-2xl font-bold tabular-nums">{fmtNum(pieces)}</span> <span className="text-muted">parça</span>
        </span>
        <span>
          <span className="font-display text-2xl font-bold tabular-nums">{fmtNum(lots)}</span> <span className="text-muted">çeşit (parça + renk)</span>
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Puzzle />} title="Parça yok">
          {kind === "surplus"
            ? "Fazlalık havuzu; setlerdeki yedek parçalar, mod artıkları ve gevşek parçalardan oluşur."
            : "Set ekledikçe parçaları burada görünür."}
        </EmptyState>
      ) : (
        <PoolGrid rows={rows} />
      )}
      <Pagination page={filters.page} total={lots} pageSize={POOL_PAGE_SIZE} hrefFor={(p) => hrefWith("/parcalar", sp, { page: p === 1 ? null : p })} />

      <LoosePartsPanel
        colors={colors.rows.map((c) => ({ id: Number(c.id), name: String(c.name), rgb: String(c.rgb) }))}
        items={loose.rows.map((r) => ({
          id: Number(r.id),
          partNum: String(r.part_num),
          colorId: Number(r.color_id),
          quantity: Number(r.quantity),
          note: (r.note as string) ?? null,
          partName: String(r.part_name),
          colorName: String(r.color_name),
          rgb: String(r.rgb),
          imgUrl: expandImg(r.img_url as string | null),
        }))}
      />
    </div>
  );
}
