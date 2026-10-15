/**
 * Rebrickable catalog import (runs on a PC or in GitHub Actions — never on Vercel).
 *
 *  1. Light data (themes, sets, minifigs, colors, parts, part categories, set↔minifig links)
 *     is always synced completely. Only new/changed rows are written to save Turso writes.
 *  2. Heavy data (set part inventories) is imported theme by theme following import_queue.
 *     Priority comes from config/import-priority.json; the rest go largest-first.
 *     Each set is written in its own transaction, so an interrupted run never corrupts data
 *     and the next run continues where it stopped.
 *  3. When the database grows close to the free-tier storage limit the import stops and a
 *     warning is stored in app_settings (shown in the app).
 *
 * Usage: npm run catalog:import [-- --max-rows=50000] [-- --light-only]
 */
import "./env";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parse } from "csv-parse";
import type { InStatement, InValue } from "@libsql/client";
import { client } from "../src/db";
import { compactImg } from "../src/lib/images";

const CDN = "https://cdn.rebrickable.com/media/downloads/";
const CACHE_DIR = path.resolve(".catalog-cache");
const CACHE_MAX_AGE_MS = 20 * 60 * 60 * 1000;
const DEFAULT_STORAGE_LIMIT = 4.5 * 1024 ** 3;

type Row = Record<string, string>;
type Priority = { id?: number; nameIncludes?: string; label?: string };

const args = process.argv.slice(2);
const argValue = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const lightOnly = args.includes("--light-only");

const config = JSON.parse(fs.readFileSync(path.resolve("config/import-priority.json"), "utf8")) as {
  priority: Priority[];
  maxRowsPerRun: number;
};
const maxRows = Number(argValue("max-rows") ?? process.env.CATALOG_MAX_ROWS ?? config.maxRowsPerRun);
const storageLimit = Number(process.env.STORAGE_LIMIT_BYTES || DEFAULT_STORAGE_LIMIT);

let rowsWritten = 0;

/* ---------------------------------------------------------------- helpers */

async function download(name: string): Promise<string> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${name}.csv.gz`);
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < CACHE_MAX_AGE_MS) return file;
  const res = await fetch(CDN + `${name}.csv.gz`, { headers: { "User-Agent": "BrickKasa catalog import" } });
  if (!res.ok) throw new Error(`Download failed for ${name}: HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function readCsv(name: string, onRow?: (row: Row) => void): Promise<Row[]> {
  const file = await download(name);
  const rows: Row[] = [];
  const parser = fs.createReadStream(file).pipe(zlib.createGunzip()).pipe(parse({ columns: true, relax_quotes: true }));
  for await (const row of parser as AsyncIterable<Row>) {
    if (onRow) onRow(row);
    else rows.push(row);
  }
  return rows;
}

const nullable = (v: string | undefined) => (v === undefined || v === "" ? null : v);
const toInt = (v: string | undefined) => (v === undefined || v === "" ? null : Number.parseInt(v, 10));
const sig = (values: unknown[]) => JSON.stringify(values);

/** Multi-row upsert, chunked to stay below SQLite's variable limit. */
function upsertStatements(
  table: string,
  columns: string[],
  keyColumns: string[],
  rows: unknown[][],
  mode: "upsert" | "ignore" = "upsert",
): InStatement[] {
  const perStatement = Math.max(1, Math.floor(2000 / columns.length));
  const statements: InStatement[] = [];
  const updates = columns.filter((c) => !keyColumns.includes(c)).map((c) => `${c}=excluded.${c}`);
  for (let i = 0; i < rows.length; i += perStatement) {
    const chunk = rows.slice(i, i + perStatement);
    const placeholders = chunk.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
    let sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders}`;
    if (mode === "ignore" || updates.length === 0) sql += ` ON CONFLICT DO NOTHING`;
    else sql += ` ON CONFLICT(${keyColumns.join(",")}) DO UPDATE SET ${updates.join(",")}`;
    statements.push({ sql, args: chunk.flat() as InValue[] });
  }
  return statements;
}

async function runBatches(statements: InStatement[]) {
  for (let i = 0; i < statements.length; i += 50) {
    await client.batch(statements.slice(i, i + 50), "write");
  }
}

/** Writes only rows whose signature differs from what is already stored. */
async function syncTable(opts: {
  table: string;
  columns: string[];
  keyColumns: string[];
  rows: unknown[][];
  existingSql: string;
}) {
  const existing = new Map<string, string>();
  const res = await client.execute(opts.existingSql);
  const keyIdx = opts.keyColumns.map((k) => opts.columns.indexOf(k));
  for (const r of res.rows) {
    const values = opts.columns.map((c) => r[c] ?? null);
    existing.set(sig(keyIdx.map((i) => values[i])), sig(values));
  }
  const changed = opts.rows.filter((row) => existing.get(sig(keyIdx.map((i) => row[i]))) !== sig(row));
  if (changed.length) await runBatches(upsertStatements(opts.table, opts.columns, opts.keyColumns, changed));
  rowsWritten += changed.length;
  console.log(`  ${opts.table}: ${opts.rows.length} rows, ${changed.length} written`);
}

async function setSetting(key: string, value: string) {
  await client.execute({
    sql: `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, unixepoch())
          ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    args: [key, value],
  });
}

async function databaseSize(): Promise<number | null> {
  try {
    const res = await client.execute("SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()");
    return Number(res.rows[0]?.size ?? 0);
  } catch {
    return null;
  }
}

async function storageOk(): Promise<boolean> {
  const size = await databaseSize();
  if (size === null) return true;
  if (size >= storageLimit) {
    await setSetting(
      "storage_warning",
      JSON.stringify({ size, limit: storageLimit, at: new Date().toISOString() }),
    );
    console.warn(`Storage limit reached (${(size / 1024 ** 3).toFixed(2)} GB). Import paused.`);
    return false;
  }
  return true;
}

/* ---------------------------------------------------------------- light data */

type ThemeRow = { id: number; parentId: number | null; name: string; rootId: number };

async function importLight() {
  console.log("Syncing light catalog data…");

  const themeRows = await readCsv("themes");
  const parents = new Map<number, number | null>(themeRows.map((t) => [Number(t.id), toInt(t.parent_id)]));
  const rootOf = (id: number): number => {
    let cur = id;
    for (let guard = 0; guard < 20; guard++) {
      const p = parents.get(cur);
      if (p === null || p === undefined) return cur;
      cur = p;
    }
    return cur;
  };
  const themes: ThemeRow[] = themeRows.map((t) => ({
    id: Number(t.id),
    parentId: toInt(t.parent_id),
    name: t.name,
    rootId: rootOf(Number(t.id)),
  }));
  await syncTable({
    table: "catalog_themes",
    columns: ["id", "parent_id", "root_id", "name"],
    keyColumns: ["id"],
    rows: themes.map((t) => [t.id, t.parentId, t.rootId, t.name]),
    existingSql: "SELECT id, parent_id, root_id, name FROM catalog_themes",
  });

  const colors = await readCsv("colors");
  await syncTable({
    table: "catalog_colors",
    columns: ["id", "name", "rgb", "is_trans"],
    keyColumns: ["id"],
    rows: colors.map((c) => [Number(c.id), c.name, c.rgb, c.is_trans === "True" || c.is_trans === "t" ? 1 : 0]),
    existingSql: "SELECT id, name, rgb, is_trans FROM catalog_colors",
  });

  const cats = await readCsv("part_categories");
  await syncTable({
    table: "catalog_part_categories",
    columns: ["id", "name"],
    keyColumns: ["id"],
    rows: cats.map((c) => [Number(c.id), c.name]),
    existingSql: "SELECT id, name FROM catalog_part_categories",
  });

  const parts = await readCsv("parts");
  await syncTable({
    table: "catalog_parts",
    columns: ["part_num", "name", "part_cat_id"],
    keyColumns: ["part_num"],
    rows: parts.map((p) => [p.part_num, p.name, toInt(p.part_cat_id)]),
    existingSql: "SELECT part_num, name, part_cat_id FROM catalog_parts",
  });

  const sets = await readCsv("sets");
  await syncTable({
    table: "catalog_sets",
    columns: ["set_num", "name", "year", "theme_id", "num_parts", "img_url"],
    keyColumns: ["set_num"],
    rows: sets.map((s) => [s.set_num, s.name, toInt(s.year), toInt(s.theme_id), toInt(s.num_parts) ?? 0, nullable(s.img_url)]),
    existingSql: "SELECT set_num, name, year, theme_id, num_parts, img_url FROM catalog_sets",
  });

  const figs = await readCsv("minifigs");
  await syncTable({
    table: "catalog_minifigs",
    columns: ["fig_num", "name", "num_parts", "img_url"],
    keyColumns: ["fig_num"],
    rows: figs.map((f) => [f.fig_num, f.name, toInt(f.num_parts) ?? 0, nullable(f.img_url)]),
    existingSql: "SELECT fig_num, name, num_parts, img_url FROM catalog_minifigs",
  });

  // set ↔ minifig links are small (~20k rows), so they are synced for every theme at once.
  const inventories = await loadInventoryMap();
  const linkMap = new Map<string, number>();
  await readCsv("inventory_minifigs", (r) => {
    const setNum = inventories.get(r.inventory_id);
    if (!setNum) return;
    const key = `${setNum}\u0000${r.fig_num}`;
    linkMap.set(key, (linkMap.get(key) ?? 0) + Number(r.quantity));
  });
  await syncTable({
    table: "set_minifigs",
    columns: ["set_num", "fig_num", "quantity"],
    keyColumns: ["set_num", "fig_num"],
    rows: [...linkMap].map(([k, q]) => [...k.split("\u0000"), q]),
    existingSql: "SELECT set_num, fig_num, quantity FROM set_minifigs",
  });

  await setSetting("catalog_light_synced_at", new Date().toISOString());
  return { themes, sets };
}

/** inventory_id → set_num, using the lowest inventory version of each set. */
let inventoryMapCache: Map<string, string> | null = null;
async function loadInventoryMap() {
  if (inventoryMapCache) return inventoryMapCache;
  const best = new Map<string, { id: string; version: number }>();
  await readCsv("inventories", (r) => {
    if (r.set_num.startsWith("fig-")) return;
    const version = Number(r.version);
    const cur = best.get(r.set_num);
    if (!cur || version < cur.version) best.set(r.set_num, { id: r.id, version });
  });
  inventoryMapCache = new Map([...best].map(([setNum, v]) => [v.id, setNum]));
  return inventoryMapCache;
}

/* ---------------------------------------------------------------- queue */

async function buildQueue(themes: ThemeRow[], sets: Row[]) {
  const children = new Map<number, number[]>();
  for (const t of themes) {
    if (t.parentId !== null) children.set(t.parentId, [...(children.get(t.parentId) ?? []), t.id]);
  }
  const subtree = (id: number): number[] => [id, ...(children.get(id) ?? []).flatMap(subtree)];
  const setCount = new Map<number, number>();
  for (const s of sets) {
    const id = toInt(s.theme_id);
    if (id !== null) setCount.set(id, (setCount.get(id) ?? 0) + 1);
  }
  const countSubtree = (id: number) => subtree(id).reduce((n, t) => n + (setCount.get(t) ?? 0), 0);

  const entries: { themeId: number; name: string; priority: number; setCount: number }[] = [];
  const covered = new Set<number>();
  let priority = 0;
  for (const p of config.priority) {
    const matches = themes.filter((t) =>
      p.id !== undefined ? t.id === p.id : p.nameIncludes ? t.name.toLowerCase().includes(p.nameIncludes.toLowerCase()) : false,
    );
    // keep only the top-most matches (skip a match whose ancestor also matched)
    const matchIds = new Set(matches.map((m) => m.id));
    for (const m of matches) {
      let anc = m.parentId;
      let skip = false;
      while (anc !== null) {
        if (matchIds.has(anc)) skip = true;
        anc = themes.find((t) => t.id === anc)?.parentId ?? null;
      }
      if (skip || covered.has(m.id)) continue;
      entries.push({ themeId: m.id, name: m.name, priority: priority++, setCount: countSubtree(m.id) });
      subtree(m.id).forEach((id) => covered.add(id));
    }
  }
  const roots = themes
    .filter((t) => t.parentId === null && !covered.has(t.id))
    .map((t) => ({ t, count: countSubtree(t.id) }))
    .sort((a, b) => b.count - a.count);
  for (const { t, count } of roots) {
    entries.push({ themeId: t.id, name: t.name, priority: 1000 + priority++, setCount: count });
  }

  // Upsert queue entries; keep status of existing ones.
  await runBatches(
    entries.map((e) => ({
      sql: `INSERT INTO import_queue (theme_id, name, priority, status, set_count, updated_at)
            VALUES (?, ?, ?, 'pending', ?, unixepoch())
            ON CONFLICT(theme_id) DO UPDATE SET name=excluded.name, priority=excluded.priority, set_count=excluded.set_count`,
      args: [e.themeId, e.name, e.priority, e.setCount],
    })),
  );
  return { subtree };
}

/* ---------------------------------------------------------------- heavy data */

async function importInventories(subtree: (id: number) => number[]) {
  const queue = await client.execute(
    "SELECT theme_id, name FROM import_queue WHERE status != 'done' ORDER BY priority",
  );
  const doneQueue = await client.execute("SELECT COUNT(*) AS n FROM import_queue WHERE status != 'done'");
  console.log(`Inventory queue: ${doneQueue.rows[0].n} theme group(s) remaining.`);

  // If every theme is done, still import inventories of sets that appeared since (new releases).
  const pendingSets = await client.execute(
    "SELECT set_num, theme_id FROM catalog_sets WHERE inventory_status = 'none'",
  );
  const pendingByTheme = new Map<number, string[]>();
  for (const r of pendingSets.rows) {
    const t = Number(r.theme_id);
    pendingByTheme.set(t, [...(pendingByTheme.get(t) ?? []), String(r.set_num)]);
  }

  const groups: { themeId: number | null; name: string; sets: string[] }[] = queue.rows.map((q) => {
    const ids = subtree(Number(q.theme_id));
    return { themeId: Number(q.theme_id), name: String(q.name), sets: ids.flatMap((id) => pendingByTheme.get(id) ?? []) };
  });
  if (groups.length === 0 && pendingSets.rows.length) {
    groups.push({ themeId: null, name: "Yeni setler", sets: pendingSets.rows.map((r) => String(r.set_num)) });
  }
  if (groups.length === 0) {
    console.log("All inventories are up to date.");
    return;
  }

  // Collect inventory rows only for sets we are going to import in this run.
  const wanted = new Set<string>();
  let budget = maxRows;
  const plannedGroups: typeof groups = [];
  const numParts = new Map<string, number>();
  const np = await client.execute("SELECT set_num, num_parts FROM catalog_sets WHERE inventory_status = 'none'");
  for (const r of np.rows) numParts.set(String(r.set_num), Number(r.num_parts));
  for (const g of groups) {
    if (budget <= 0) break;
    plannedGroups.push(g);
    for (const s of g.sets) {
      wanted.add(s);
      budget -= Math.max(1, Math.ceil((numParts.get(s) ?? 0) / 4)); // ~4 parts per distinct row
    }
  }

  console.log(`Reading inventory_parts.csv for ${wanted.size} set(s)…`);
  const inventories = await loadInventoryMap();
  const rowsBySet = new Map<string, Map<string, { part: string; color: number; spare: number; qty: number }>>();
  const images = new Map<string, string>();
  await readCsv("inventory_parts", (r) => {
    const setNum = inventories.get(r.inventory_id);
    if (!setNum || !wanted.has(setNum)) return;
    const spare = r.is_spare === "True" || r.is_spare === "t" ? 1 : 0;
    const color = Number(r.color_id);
    const key = `${r.part_num}|${color}|${spare}`;
    let m = rowsBySet.get(setNum);
    if (!m) rowsBySet.set(setNum, (m = new Map()));
    const cur = m.get(key);
    if (cur) cur.qty += Number(r.quantity);
    else m.set(key, { part: r.part_num, color, spare, qty: Number(r.quantity) });
    const img = compactImg(r.img_url);
    if (img) images.set(`${r.part_num}|${color}`, img);
  });

  const existingImages = new Set<string>();
  const imgRes = await client.execute("SELECT part_num, color_id FROM part_images");
  for (const r of imgRes.rows) existingImages.add(`${r.part_num}|${r.color_id}`);

  let setsSinceCheck = 0;
  for (const g of plannedGroups) {
    console.log(`→ ${g.name}: ${g.sets.length} set(s)`);
    let failed: string | null = null;
    for (const setNum of g.sets) {
      if (rowsWritten >= maxRows) break;
      if (++setsSinceCheck >= 200) {
        setsSinceCheck = 0;
        if (!(await storageOk())) return;
      }
      const rows = [...(rowsBySet.get(setNum)?.values() ?? [])];
      const imgRows: unknown[][] = [];
      for (const r of rows) {
        const k = `${r.part}|${r.color}`;
        const img = images.get(k);
        if (img && !existingImages.has(k)) {
          imgRows.push([r.part, r.color, img]);
          existingImages.add(k);
        }
      }
      const statements: InStatement[] = [
        { sql: "DELETE FROM set_inventory WHERE set_num = ?", args: [setNum] },
        ...upsertStatements(
          "set_inventory",
          ["set_num", "part_num", "color_id", "is_spare", "quantity"],
          ["set_num", "part_num", "color_id", "is_spare"],
          rows.map((r) => [setNum, r.part, r.color, r.spare, r.qty]),
        ),
        ...upsertStatements("part_images", ["part_num", "color_id", "img_url"], ["part_num", "color_id"], imgRows, "ignore"),
        { sql: "UPDATE catalog_sets SET inventory_status = 'csv' WHERE set_num = ?", args: [setNum] },
      ];
      try {
        await client.batch(statements, "write"); // one transaction per set
        rowsWritten += rows.length + imgRows.length + 1;
      } catch (err) {
        failed = String(err);
        console.error(`  ${setNum} failed:`, err);
      }
    }
    if (g.themeId === null) continue;
    const remaining = g.sets.length
      ? await client.execute({
          sql: `SELECT COUNT(*) AS n FROM catalog_sets WHERE inventory_status = 'none' AND set_num IN (${g.sets.map(() => "?").join(",")})`,
          args: g.sets,
        })
      : { rows: [{ n: 0 }] };
    const done = Number(remaining.rows[0].n) === 0;
    await client.execute({
      sql: "UPDATE import_queue SET status = ?, last_error = ?, updated_at = unixepoch() WHERE theme_id = ?",
      args: [done ? "done" : failed ? "error" : "pending", failed, g.themeId],
    });
    if (rowsWritten >= maxRows) {
      console.log(`Row budget for this run reached (${rowsWritten}). Continuing next run.`);
      break;
    }
  }
}

/* ---------------------------------------------------------------- main */

async function main() {
  const started = Date.now();
  if (!(await storageOk())) return;
  await client.execute("DELETE FROM app_settings WHERE key = 'storage_warning'");
  const { themes, sets } = await importLight();
  const { subtree } = await buildQueue(themes, sets);
  if (!lightOnly) await importInventories(subtree);
  await storageOk();
  await setSetting("catalog_import_last_run", new Date().toISOString());
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(0)}s, ${rowsWritten} rows written.`);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
