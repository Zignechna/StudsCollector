import type { Metadata } from "next";
import Link from "next/link";
import { Download, PackageCheck } from "lucide-react";
import { client } from "@/db";
import { expandImg } from "@/lib/images";
import { fmtNum, setNumDisplay } from "@/lib/format";
import { SetImage } from "@/components/set-card";
import { EmptyState, PageHeader } from "@/components/ui";
import { MissingRow } from "./missing-row";

export const metadata: Metadata = { title: "Eksik Parçalar" };

export default async function MissingPage() {
  const res = await client.execute(`
    SELECT o.id AS owned_id, o.set_num, s.name AS set_name, s.img_url AS set_img,
           (SELECT COUNT(*) FROM owned_sets o2 WHERE o2.set_num = o.set_num AND o2.id <= o.id) AS copy_no,
           (SELECT COUNT(*) FROM owned_sets o3 WHERE o3.set_num = o.set_num) AS copies,
           m.part_num, m.color_id, m.quantity,
           COALESCE(p.name, m.part_num) AS part_name, COALESCE(c.name, '?') AS color_name, COALESCE(c.rgb, 'CCCCCC') AS rgb,
           img.img_url,
           (SELECT SUM(si.quantity) FROM set_inventory si WHERE si.set_num = o.set_num AND si.part_num = m.part_num AND si.color_id = m.color_id) AS in_set
    FROM missing_parts m
    JOIN owned_sets o ON o.id = m.owned_set_id
    LEFT JOIN catalog_sets s ON s.set_num = o.set_num
    LEFT JOIN catalog_parts p ON p.part_num = m.part_num
    LEFT JOIN catalog_colors c ON c.id = m.color_id
    LEFT JOIN part_images img ON img.part_num = m.part_num AND img.color_id = m.color_id
    ORDER BY s.name, o.id, p.name`);

  type Group = {
    ownedId: number;
    setNum: string;
    setName: string;
    setImg: string | null;
    copyNo: number;
    copies: number;
    parts: { partNum: string; colorId: number; quantity: number; partName: string; colorName: string; rgb: string; imgUrl: string | null; inSet: number }[];
  };
  const groups = new Map<number, Group>();
  for (const r of res.rows) {
    const id = Number(r.owned_id);
    if (!groups.has(id)) {
      groups.set(id, {
        ownedId: id,
        setNum: String(r.set_num),
        setName: String(r.set_name ?? r.set_num),
        setImg: (r.set_img as string) ?? null,
        copyNo: Number(r.copy_no),
        copies: Number(r.copies),
        parts: [],
      });
    }
    groups.get(id)!.parts.push({
      partNum: String(r.part_num),
      colorId: Number(r.color_id),
      quantity: Number(r.quantity),
      partName: String(r.part_name),
      colorName: String(r.color_name),
      rgb: String(r.rgb),
      imgUrl: expandImg(r.img_url as string | null),
      inSet: Number(r.in_set ?? r.quantity),
    });
  }
  const list = [...groups.values()];
  const total = list.reduce((a, g) => a + g.parts.reduce((b, p) => b + p.quantity, 0), 0);

  return (
    <div>
      <PageHeader
        title="Eksik parçalar"
        description="Setlerinde eksik olan parçalar, sete göre gruplu. Eksik işaretlemek için set sayfasındaki Parçalar sekmesini kullan."
        actions={
          list.length > 0 ? (
            <a href="/api/export/missing" className="btn-secondary">
              <Download className="size-4" /> CSV (Rebrickable)
            </a>
          ) : undefined
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={<PackageCheck />} title="Eksik parça yok">
          Harika! Bir sette eksik varsa set sayfasında <span className="font-semibold">Parçalar → Eksik parça işaretle</span> ile ekleyebilirsin.
        </EmptyState>
      ) : (
        <>
          <p className="mb-5 text-sm text-fg-2">
            <span className="font-display text-2xl font-bold text-bad">{fmtNum(total)}</span> eksik parça · {list.length} set kopyası
          </p>
          <div className="space-y-4">
            {list.map((g) => (
              <section key={g.ownedId} id={`set-${g.ownedId}`} className="card scroll-mt-28 overflow-hidden">
                <Link href={`/set/${encodeURIComponent(g.setNum)}`} className="flex items-center gap-3 border-b border-line p-3 hover:bg-surface-2">
                  <SetImage src={g.setImg} alt={g.setName} className="h-12 w-16 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{g.setName}</div>
                    <div className="text-xs text-muted">
                      <span className="font-mono">{setNumDisplay(g.setNum)}</span>
                      {g.copies > 1 ? ` · Kopya #${g.copyNo}` : ""}
                    </div>
                  </div>
                  <span className="badge bg-bad-soft px-2 py-1 text-bad">{g.parts.reduce((a, p) => a + p.quantity, 0)} eksik</span>
                </Link>
                <ul className="divide-y divide-line">
                  {g.parts.map((p) => (
                    <MissingRow key={`${p.partNum}|${p.colorId}`} ownedSetId={g.ownedId} part={p} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
