import { LogoMark } from "@/components/logo";

export const metadata = { title: "Çevrimdışı" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-header px-6 text-center">
      <LogoMark className="mb-4 size-14 opacity-80" />
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-white">İnternet bağlantısı yok</h1>
      <p className="mt-2 max-w-sm text-sm text-white/60">StudsCollector verilerini sunucudan alıyor. Bağlantı geri geldiğinde sayfayı yenile.</p>
      {/* Full page load on purpose: retries the network instead of a client-side transition. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="btn-primary mt-6">
        Tekrar dene
      </a>
    </main>
  );
}
