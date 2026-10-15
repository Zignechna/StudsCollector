/** Web Push sender shared by the app (test notification) and GitHub Actions scripts. */
import webpush from "web-push";
import { client } from "@/db";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!pushConfigured()) return { sent: 0, failed: 0 };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@brickkasa.local",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const subs = await client.execute("SELECT id, endpoint, p256dh, auth FROM push_subscriptions");
  let sent = 0;
  let failed = 0;
  for (const s of subs.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: String(s.endpoint), keys: { p256dh: String(s.p256dh), auth: String(s.auth) } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 },
      );
      sent++;
    } catch (err) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      // Subscription expired or revoked: forget it.
      if (status === 404 || status === 410) {
        await client.execute({ sql: "DELETE FROM push_subscriptions WHERE id = ?", args: [s.id] });
      }
    }
  }
  return { sent, failed };
}
