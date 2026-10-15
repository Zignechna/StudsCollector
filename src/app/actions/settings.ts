"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAuth } from "@/lib/auth";
import { pushConfigured, sendPushToAll } from "@/lib/push";

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, deviceName: string) {
  await requireAuth();
  await db
    .insert(schema.pushSubscriptions)
    .values({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, deviceName: deviceName.slice(0, 80) })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, deviceName: deviceName.slice(0, 80) },
    });
  return { ok: true, message: "Bu cihazda bildirimler açıldı." };
}

export async function removePushSubscription(endpoint: string) {
  await requireAuth();
  await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
  return { ok: true, message: "Bu cihazda bildirimler kapatıldı." };
}

export async function sendTestPush() {
  await requireAuth();
  if (!pushConfigured()) return { ok: false, message: "VAPID anahtarları tanımlı değil." };
  const res = await sendPushToAll({ title: "BrickKasa", body: "Test bildirimi — bildirimler çalışıyor! 🧱", url: "/ayarlar", tag: "test" });
  return res.sent > 0
    ? { ok: true, message: `${res.sent} cihaza gönderildi.` }
    : { ok: false, message: "Kayıtlı cihaz yok veya gönderim başarısız." };
}
