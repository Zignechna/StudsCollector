"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions/settings";
import { toast, toastResult } from "@/components/toast";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function deviceName() {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : "Cihaz";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Tarayıcı";
  return `${os} · ${browser}`;
}

export function PushSetting({ publicKey }: { publicKey: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability check
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription().then(setSub));
  }, []);

  if (supported === null) return null;
  if (!supported) return <p className="text-sm text-muted">Bu tarayıcı bildirimleri desteklemiyor.</p>;
  if (!publicKey) return <p className="text-sm text-muted">VAPID anahtarı tanımlı değil.</p>;

  const enable = () =>
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return toast("Bildirim izni verilmedi.", "error");
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
        await navigator.serviceWorker.ready;
        const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
        const json = s.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        toastResult(await savePushSubscription(json, deviceName()));
        setSub(s);
      } catch (err) {
        toast(`Bildirim açılamadı: ${(err as Error).message}`, "error");
      }
    });

  const disable = () =>
    start(async () => {
      if (!sub) return;
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      toastResult(await removePushSubscription(endpoint));
      setSub(null);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {sub ? (
        <button type="button" className="btn-secondary" disabled={pending} onClick={disable}>
          <BellOff className="size-4" /> Bu cihazda kapat
        </button>
      ) : (
        <button type="button" className="btn-primary" disabled={pending} onClick={enable}>
          <Bell className="size-4" /> Bu cihazda aç
        </button>
      )}
      <button type="button" className="btn-ghost" disabled={pending} onClick={() => start(async () => toastResult(await sendTestPush()))}>
        <Send className="size-4" /> Test bildirimi
      </button>
    </div>
  );
}
