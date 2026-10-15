import type { ThemeOption } from "@/components/filter-bar";
import type { ThemeTree } from "./themes";

/** Flattens (part of) the theme tree into picker options, skipping empty themes. */
export function themeOptions(tree: ThemeTree, rootIds?: number[]): ThemeOption[] {
  const out: ThemeOption[] = [];
  const walk = (id: number, depth: number) => {
    const n = tree.nodes.get(id);
    if (!n || n.total === 0) return;
    out.push({ id: n.id, name: n.name, depth, total: n.total });
    for (const c of n.children) walk(c, depth + 1);
  };
  const roots = rootIds ?? [...tree.roots].sort((a, b) => a.name.localeCompare(b.name, "tr")).map((r) => r.id);
  for (const r of roots) walk(r, 0);
  return out;
}
