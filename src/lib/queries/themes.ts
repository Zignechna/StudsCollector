import "server-only";
import { cache } from "react";
import { client } from "@/db";

export type ThemeNode = {
  id: number;
  parentId: number | null;
  rootId: number;
  name: string;
  children: number[];
  /** counts over the whole subtree */
  total: number;
  owned: number;
  wished: number;
  /** a representative image (latest owned set, else latest set) */
  coverImg: string | null;
};

export type ThemeTree = {
  nodes: Map<number, ThemeNode>;
  roots: ThemeNode[];
  subtree: (id: number) => number[];
  path: (id: number) => ThemeNode[];
};

/** Loads the whole theme hierarchy with collection progress, once per request. */
export const getThemeTree = cache(async (): Promise<ThemeTree> => {
  const [themesRes, countsRes, coverRes] = await Promise.all([
    client.execute("SELECT id, parent_id, root_id, name FROM catalog_themes"),
    client.execute(`
      SELECT s.theme_id AS theme_id,
             COUNT(*) AS total,
             SUM(CASE WHEN o.set_num IS NOT NULL THEN 1 ELSE 0 END) AS owned,
             SUM(CASE WHEN w.set_num IS NOT NULL THEN 1 ELSE 0 END) AS wished
      FROM catalog_sets s
      LEFT JOIN (SELECT DISTINCT set_num FROM owned_sets) o ON o.set_num = s.set_num
      LEFT JOIN wishlist w ON w.set_num = s.set_num
      GROUP BY s.theme_id`),
    client.execute(`
      SELECT theme_id, img_url FROM (
        SELECT s.theme_id, s.img_url,
               ROW_NUMBER() OVER (PARTITION BY s.theme_id
                 ORDER BY (o.set_num IS NOT NULL) DESC, s.num_parts DESC) AS rn
        FROM catalog_sets s
        LEFT JOIN (SELECT DISTINCT set_num FROM owned_sets) o ON o.set_num = s.set_num
        WHERE s.img_url IS NOT NULL AND s.num_parts > 50
      ) WHERE rn = 1`),
  ]);

  const nodes = new Map<number, ThemeNode>();
  for (const r of themesRes.rows) {
    nodes.set(Number(r.id), {
      id: Number(r.id),
      parentId: r.parent_id == null ? null : Number(r.parent_id),
      rootId: Number(r.root_id),
      name: String(r.name),
      children: [],
      total: 0,
      owned: 0,
      wished: 0,
      coverImg: null,
    });
  }
  for (const n of nodes.values()) {
    if (n.parentId != null) nodes.get(n.parentId)?.children.push(n.id);
  }
  const own = new Map<number, { total: number; owned: number; wished: number }>();
  for (const r of countsRes.rows) {
    own.set(Number(r.theme_id), { total: Number(r.total), owned: Number(r.owned), wished: Number(r.wished) });
  }
  const covers = new Map<number, string>();
  for (const r of coverRes.rows) covers.set(Number(r.theme_id), String(r.img_url));

  const visit = (id: number): ThemeNode => {
    const n = nodes.get(id)!;
    const c = own.get(id);
    n.total = c?.total ?? 0;
    n.owned = c?.owned ?? 0;
    n.wished = c?.wished ?? 0;
    n.coverImg = covers.get(id) ?? null;
    for (const childId of n.children) {
      const child = visit(childId);
      n.total += child.total;
      n.owned += child.owned;
      n.wished += child.wished;
      if (!n.coverImg || (child.owned > 0 && !c?.owned)) n.coverImg = child.coverImg ?? n.coverImg;
    }
    n.children.sort((a, b) => nodes.get(a)!.name.localeCompare(nodes.get(b)!.name, "tr"));
    return n;
  };
  const roots = [...nodes.values()].filter((n) => n.parentId == null).map((n) => visit(n.id));

  const subtree = (id: number): number[] => {
    const n = nodes.get(id);
    return n ? [id, ...n.children.flatMap(subtree)] : [];
  };
  const path = (id: number): ThemeNode[] => {
    const out: ThemeNode[] = [];
    let cur = nodes.get(id);
    while (cur) {
      out.unshift(cur);
      cur = cur.parentId != null ? nodes.get(cur.parentId) : undefined;
    }
    return out;
  };

  return { nodes, roots, subtree, path };
});
