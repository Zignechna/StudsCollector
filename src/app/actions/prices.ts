"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAuth } from "@/lib/auth";
import { detectSite } from "@/lib/price/sites";
import type { ActionResult } from "./collection";

const ALERT_TYPES = ["any_drop", "below", "percent", "all_time_low"] as const;

function cleanUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/.test(u.protocol)) return null;
    // tracking parameters are noise; keep the rest (some sites need query params for variants)
    for (const p of [...u.searchParams.keys()]) if (/^(utm_|gclid|fbclid|ref_|tag$)/i.test(p)) u.searchParams.delete(p);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export async function createProduct(input: {
  name: string;
  imgUrl?: string | null;
  setNum?: string | null;
  notes?: string | null;
  urls: string[];
}): Promise<ActionResult> {
  await requireAuth();
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Ürün adı gerekli." };
  const [row] = await db
    .insert(schema.trackedProducts)
    .values({ name, imgUrl: input.imgUrl || null, setNum: input.setNum || null, notes: input.notes || null })
    .returning({ id: schema.trackedProducts.id });
  for (const raw of input.urls) {
    const url = cleanUrl(raw);
    if (!url) continue;
    const site = detectSite(url);
    await db.insert(schema.productListings).values({ productId: row.id, site: site.id, url, currency: site.currency });
  }
  // sensible default rule
  await db.insert(schema.priceAlerts).values({ productId: row.id, type: "any_drop" });
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function updateProduct(id: number, formData: FormData): Promise<ActionResult> {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Ürün adı gerekli." };
  await db
    .update(schema.trackedProducts)
    .set({
      name,
      imgUrl: String(formData.get("imgUrl") ?? "").trim() || null,
      setNum: String(formData.get("setNum") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .where(eq(schema.trackedProducts.id, id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Kaydedildi." };
}

export async function deleteProduct(id: number): Promise<ActionResult> {
  await requireAuth();
  const listings = await db.select({ id: schema.productListings.id }).from(schema.productListings).where(eq(schema.productListings.productId, id));
  for (const l of listings) await db.delete(schema.priceHistory).where(eq(schema.priceHistory.listingId, l.id));
  await db.delete(schema.productListings).where(eq(schema.productListings.productId, id));
  await db.delete(schema.priceAlerts).where(eq(schema.priceAlerts.productId, id));
  await db.delete(schema.trackedProducts).where(eq(schema.trackedProducts.id, id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addListing(productId: number, rawUrl: string, currency?: string): Promise<ActionResult> {
  await requireAuth();
  const url = cleanUrl(rawUrl);
  if (!url) return { ok: false, message: "Geçerli bir link gir (https://…)." };
  const site = detectSite(url);
  await db.insert(schema.productListings).values({
    productId,
    site: site.id,
    url,
    currency: currency === "EUR" || currency === "TRY" ? currency : site.currency,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Link eklendi. Fiyat bir sonraki otomatik kontrolde gelir." };
}

export async function deleteListing(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.delete(schema.priceHistory).where(eq(schema.priceHistory.listingId, id));
  await db.delete(schema.productListings).where(eq(schema.productListings.id, id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Link silindi." };
}

export async function saveAlert(productId: number, type: string, value: number | null): Promise<ActionResult> {
  await requireAuth();
  if (!ALERT_TYPES.includes(type as (typeof ALERT_TYPES)[number])) return { ok: false, message: "Geçersiz kural." };
  if ((type === "below" || type === "percent") && (value == null || !(value > 0))) {
    return { ok: false, message: type === "below" ? "Hedef fiyatı gir." : "Yüzdeyi gir." };
  }
  const existing = await db.query.priceAlerts.findFirst({
    where: and(eq(schema.priceAlerts.productId, productId), eq(schema.priceAlerts.type, type)),
  });
  if (existing) await db.update(schema.priceAlerts).set({ value, lastNotifiedPrice: null }).where(eq(schema.priceAlerts.id, existing.id));
  else await db.insert(schema.priceAlerts).values({ productId, type, value });
  revalidatePath("/", "layout");
  return { ok: true, message: "Bildirim kuralı kaydedildi." };
}

export async function deleteAlert(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.delete(schema.priceAlerts).where(eq(schema.priceAlerts.id, id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Kural silindi." };
}
