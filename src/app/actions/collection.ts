"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAuth } from "@/lib/auth";
import { ensureAlternates, ensureCatalogSet, ensureInventory, ensureMoc, ensureMocInventory } from "@/lib/rebrickable";
import { refreshBrickset } from "@/lib/brickset";
import { normalizeSetNum } from "@/lib/format";

export type ActionResult = { ok: boolean; message?: string; id?: number };

const OWNED_STATUSES = ["sealed", "built", "disassembled"] as const;

function refreshAll() {
  revalidatePath("/", "layout");
}

const toInt = (v: FormDataEntryValue | null) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};
const str = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

/* ------------------------------------------------------------ owned sets */

export async function addOwnedSet(input: {
  setNum: string;
  status?: string;
  acquiredAt?: string | null;
  buildModeId?: number | null;
  notes?: string | null;
  quantity?: number;
  removeFromWishlist?: boolean;
}): Promise<ActionResult> {
  await requireAuth();
  const setNum = normalizeSetNum(input.setNum);
  if (!(await ensureCatalogSet(setNum))) {
    return { ok: false, message: `${setNum} katalogda bulunamadı. Set numarasını kontrol et.` };
  }
  let warning: string | undefined;
  try {
    const inv = await ensureInventory(setNum);
    if (inv === "none") warning = "Bu setin parça listesi henüz yok; Rebrickable API anahtarı eklenince otomatik çekilecek.";
  } catch (err) {
    warning = `Parça listesi alınamadı: ${(err as Error).message}`;
  }
  await refreshBrickset(setNum);

  const status = OWNED_STATUSES.includes(input.status as (typeof OWNED_STATUSES)[number]) ? input.status! : "built";
  const qty = Math.min(Math.max(input.quantity ?? 1, 1), 50);
  let id: number | undefined;
  for (let i = 0; i < qty; i++) {
    const [row] = await db
      .insert(schema.ownedSets)
      .values({
        setNum,
        status,
        acquiredAt: input.acquiredAt || null,
        buildModeId: input.buildModeId ?? null,
        notes: input.notes || null,
      })
      .returning({ id: schema.ownedSets.id });
    id ??= row.id;
  }
  if (input.removeFromWishlist !== false) {
    await db.delete(schema.wishlist).where(eq(schema.wishlist.setNum, setNum));
  }
  refreshAll();
  return { ok: true, id, message: warning };
}

export async function updateOwnedSet(id: number, formData: FormData): Promise<ActionResult> {
  await requireAuth();
  const status = String(formData.get("status") ?? "built");
  await db
    .update(schema.ownedSets)
    .set({
      status: OWNED_STATUSES.includes(status as (typeof OWNED_STATUSES)[number]) ? status : "built",
      acquiredAt: str(formData.get("acquiredAt")),
      buildModeId: toInt(formData.get("buildModeId")),
      notes: str(formData.get("notes")),
    })
    .where(eq(schema.ownedSets.id, id));
  refreshAll();
  return { ok: true, message: "Kaydedildi." };
}

export async function deleteOwnedSet(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.delete(schema.missingParts).where(eq(schema.missingParts.ownedSetId, id));
  await db.delete(schema.ownedSets).where(eq(schema.ownedSets.id, id));
  refreshAll();
  return { ok: true };
}

/* ------------------------------------------------------------ catalog data */

export async function refreshSetData(setNum: string): Promise<ActionResult> {
  await requireAuth();
  const ok = await refreshBrickset(setNum, true);
  try {
    await ensureInventory(setNum);
  } catch {
    /* ignore — shown on page */
  }
  refreshAll();
  return ok
    ? { ok: true, message: "Brickset verisi güncellendi." }
    : { ok: false, message: "Brickset verisi alınamadı (API anahtarı eksik veya günlük limit doldu)." };
}

export async function setManualExitDate(setNum: string, date: string | null): Promise<ActionResult> {
  await requireAuth();
  const value = date && /^\d{4}-\d{2}(-\d{2})?$/.test(date) ? (date.length === 7 ? `${date}-01` : date) : null;
  await db.update(schema.catalogSets).set({ exitDateManual: value }).where(eq(schema.catalogSets.setNum, setNum));
  refreshAll();
  return { ok: true, message: value ? "Tahmini emeklilik tarihi kaydedildi." : "Elle girilen tarih silindi." };
}

/* ------------------------------------------------------------ wishlist */

export async function toggleWishlist(setNum: string): Promise<ActionResult> {
  await requireAuth();
  const existing = await db.query.wishlist.findFirst({ where: eq(schema.wishlist.setNum, setNum) });
  if (existing) {
    await db.delete(schema.wishlist).where(eq(schema.wishlist.setNum, setNum));
  } else {
    if (!(await ensureCatalogSet(setNum))) return { ok: false, message: "Set bulunamadı." };
    await db.insert(schema.wishlist).values({ setNum, priority: 3 });
    await refreshBrickset(setNum);
  }
  refreshAll();
  return { ok: true, message: existing ? "İstek listesinden çıkarıldı." : "İstek listesine eklendi." };
}

export async function updateWishlistItem(setNum: string, priority: number, note: string | null): Promise<ActionResult> {
  await requireAuth();
  await db
    .update(schema.wishlist)
    .set({ priority: Math.min(Math.max(priority, 1), 5), note: note?.trim() || null })
    .where(eq(schema.wishlist.setNum, setNum));
  refreshAll();
  return { ok: true };
}

/* ------------------------------------------------------------ missing parts */

export async function setMissingPart(ownedSetId: number, partNum: string, colorId: number, quantity: number): Promise<ActionResult> {
  await requireAuth();
  const where = and(
    eq(schema.missingParts.ownedSetId, ownedSetId),
    eq(schema.missingParts.partNum, partNum),
    eq(schema.missingParts.colorId, colorId),
  );
  if (quantity <= 0) {
    await db.delete(schema.missingParts).where(where);
  } else {
    await db
      .insert(schema.missingParts)
      .values({ ownedSetId, partNum, colorId, quantity })
      .onConflictDoUpdate({
        target: [schema.missingParts.ownedSetId, schema.missingParts.partNum, schema.missingParts.colorId],
        set: { quantity },
      });
  }
  refreshAll();
  return { ok: true };
}

export async function clearMissingForSet(ownedSetId: number): Promise<ActionResult> {
  await requireAuth();
  await db.delete(schema.missingParts).where(eq(schema.missingParts.ownedSetId, ownedSetId));
  refreshAll();
  return { ok: true };
}

/* ------------------------------------------------------------ loose parts */

export async function addLoosePart(input: { partNum: string; colorId: number; quantity: number; note?: string | null }): Promise<ActionResult> {
  await requireAuth();
  const part = await db.query.catalogParts.findFirst({ where: eq(schema.catalogParts.partNum, input.partNum.trim()) });
  if (!part) return { ok: false, message: "Parça numarası katalogda bulunamadı." };
  if (input.quantity <= 0) return { ok: false, message: "Adet en az 1 olmalı." };
  await db.insert(schema.looseParts).values({
    partNum: part.partNum,
    colorId: input.colorId,
    quantity: input.quantity,
    note: input.note?.trim() || null,
  });
  refreshAll();
  return { ok: true, message: "Gevşek parça eklendi." };
}

export async function updateLoosePart(id: number, quantity: number): Promise<ActionResult> {
  await requireAuth();
  if (quantity <= 0) await db.delete(schema.looseParts).where(eq(schema.looseParts.id, id));
  else await db.update(schema.looseParts).set({ quantity }).where(eq(schema.looseParts.id, id));
  refreshAll();
  return { ok: true };
}

/* ------------------------------------------------------------ build modes */

export async function createBuildMode(setNum: string, name: string): Promise<ActionResult> {
  await requireAuth();
  if (!name.trim()) return { ok: false, message: "Mod adı gerekli." };
  const [row] = await db.insert(schema.buildModes).values({ setNum, name: name.trim() }).returning({ id: schema.buildModes.id });
  refreshAll();
  return { ok: true, id: row.id };
}

export async function renameBuildMode(id: number, name: string): Promise<ActionResult> {
  await requireAuth();
  await db.update(schema.buildModes).set({ name: name.trim() }).where(eq(schema.buildModes.id, id));
  refreshAll();
  return { ok: true };
}

export async function deleteBuildMode(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.delete(schema.buildModeLeftovers).where(eq(schema.buildModeLeftovers.buildModeId, id));
  await db.update(schema.ownedSets).set({ buildModeId: null }).where(eq(schema.ownedSets.buildModeId, id));
  await db.delete(schema.buildModes).where(eq(schema.buildModes.id, id));
  refreshAll();
  return { ok: true };
}

export async function setLeftover(buildModeId: number, partNum: string, colorId: number, quantity: number): Promise<ActionResult> {
  await requireAuth();
  const where = and(
    eq(schema.buildModeLeftovers.buildModeId, buildModeId),
    eq(schema.buildModeLeftovers.partNum, partNum),
    eq(schema.buildModeLeftovers.colorId, colorId),
  );
  if (quantity <= 0) await db.delete(schema.buildModeLeftovers).where(where);
  else
    await db
      .insert(schema.buildModeLeftovers)
      .values({ buildModeId, partNum, colorId, quantity })
      .onConflictDoUpdate({
        target: [schema.buildModeLeftovers.buildModeId, schema.buildModeLeftovers.partNum, schema.buildModeLeftovers.colorId],
        set: { quantity },
      });
  refreshAll();
  return { ok: true };
}

export async function setOwnedBuildMode(ownedSetId: number, buildModeId: number | null): Promise<ActionResult> {
  await requireAuth();
  await db.update(schema.ownedSets).set({ buildModeId }).where(eq(schema.ownedSets.id, ownedSetId));
  refreshAll();
  return { ok: true };
}

/* ------------------------------------------------------------ custom collections */

export async function saveCustomCollection(id: number | null, formData: FormData): Promise<ActionResult> {
  await requireAuth();
  const name = str(formData.get("name"));
  if (!name) return { ok: false, message: "Koleksiyon adı gerekli." };
  const values = { name, description: str(formData.get("description")), coverImg: str(formData.get("coverImg")) };
  if (id) {
    await db.update(schema.customCollections).set(values).where(eq(schema.customCollections.id, id));
    refreshAll();
    return { ok: true, id };
  }
  const [row] = await db.insert(schema.customCollections).values(values).returning({ id: schema.customCollections.id });
  refreshAll();
  return { ok: true, id: row.id };
}

export async function deleteCustomCollection(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.delete(schema.customCollectionItems).where(eq(schema.customCollectionItems.collectionId, id));
  await db.delete(schema.customCollections).where(eq(schema.customCollections.id, id));
  refreshAll();
  return { ok: true };
}

export async function toggleCollectionItem(
  collectionId: number,
  item: { setNum?: string; figNum?: string },
): Promise<ActionResult> {
  await requireAuth();
  const cond = item.setNum
    ? eq(schema.customCollectionItems.setNum, item.setNum)
    : eq(schema.customCollectionItems.figNum, item.figNum ?? "");
  const where = and(eq(schema.customCollectionItems.collectionId, collectionId), cond);
  const existing = await db.query.customCollectionItems.findFirst({ where });
  if (existing) {
    await db.delete(schema.customCollectionItems).where(where);
  } else {
    if (item.setNum && !(await ensureCatalogSet(item.setNum))) return { ok: false, message: "Set bulunamadı." };
    await db.insert(schema.customCollectionItems).values({
      collectionId,
      setNum: item.setNum ?? null,
      figNum: item.figNum ?? null,
    });
  }
  refreshAll();
  return { ok: true, message: existing ? "Koleksiyondan çıkarıldı." : "Koleksiyona eklendi." };
}

/* ------------------------------------------------------------ minifigs */

export async function addOwnedMinifig(figNum: string, quantity = 1, note?: string | null): Promise<ActionResult> {
  await requireAuth();
  const fig = await db.query.catalogMinifigs.findFirst({ where: eq(schema.catalogMinifigs.figNum, figNum) });
  if (!fig) return { ok: false, message: "Minifigür bulunamadı." };
  const existing = await db.query.ownedMinifigs.findFirst({ where: eq(schema.ownedMinifigs.figNum, figNum) });
  if (existing) {
    await db
      .update(schema.ownedMinifigs)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(schema.ownedMinifigs.id, existing.id));
  } else {
    await db.insert(schema.ownedMinifigs).values({ figNum, quantity, note: note ?? null });
  }
  refreshAll();
  return { ok: true, message: "Figür eklendi." };
}

export async function setOwnedMinifigQuantity(figNum: string, quantity: number): Promise<ActionResult> {
  await requireAuth();
  if (quantity <= 0) await db.delete(schema.ownedMinifigs).where(eq(schema.ownedMinifigs.figNum, figNum));
  else {
    const existing = await db.query.ownedMinifigs.findFirst({ where: eq(schema.ownedMinifigs.figNum, figNum) });
    if (existing) await db.update(schema.ownedMinifigs).set({ quantity }).where(eq(schema.ownedMinifigs.id, existing.id));
    else await db.insert(schema.ownedMinifigs).values({ figNum, quantity });
  }
  refreshAll();
  return { ok: true };
}

/* ------------------------------------------------------------ alternates / MOCs */

export async function loadAlternates(setNum: string): Promise<ActionResult> {
  await requireAuth();
  try {
    const ok = await ensureAlternates(setNum, true);
    refreshAll();
    return ok ? { ok: true } : { ok: false, message: "Rebrickable API anahtarı gerekli." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function loadMocInventory(mocNum: string): Promise<ActionResult> {
  await requireAuth();
  try {
    const exists = await ensureMoc(mocNum);
    if (!exists) return { ok: false, message: "MOC bulunamadı veya API anahtarı eksik." };
    await ensureMocInventory(mocNum);
    refreshAll();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function getBuildModesFor(setNum: string): Promise<{ id: number; name: string }[]> {
  await requireAuth();
  return db
    .select({ id: schema.buildModes.id, name: schema.buildModes.name })
    .from(schema.buildModes)
    .where(eq(schema.buildModes.setNum, setNum));
}

/** Checks any MOC / alternate number against the pools; remembered in the "checked MOCs" list. */
export async function checkMoc(mocNum: string): Promise<ActionResult> {
  await requireAuth();
  const num = mocNum.trim().toUpperCase().startsWith("MOC-") ? `MOC-${mocNum.trim().slice(4)}` : normalizeSetNum(mocNum);
  const res = await loadMocInventory(num);
  if (!res.ok) return res;
  const row = await db.query.appSettings.findFirst({ where: eq(schema.appSettings.key, "checked_mocs") });
  const list = new Set<string>(row ? (JSON.parse(row.value) as string[]) : []);
  list.add(num);
  const value = JSON.stringify([...list]);
  await db
    .insert(schema.appSettings)
    .values({ key: "checked_mocs", value })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value } });
  refreshAll();
  return { ok: true };
}
