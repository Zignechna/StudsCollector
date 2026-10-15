import type { Metadata } from "next";
import { Database, Download, KeyRound, LogOut } from "lucide-react";
import { client } from "@/db";
import { logout } from "@/app/actions/auth";
import { getImportStatus } from "@/lib/queries/stats";
import { fmtDate, fmtNum, pct } from "@/lib/format";
import { PageHeader, ProgressBar } from "@/components/ui";
import { ThemeSetting } from "./theme-setting";
import { PasswordForm } from "./password-form";
import { PushSetting } from "./push-setting";

export const metadata: Metadata = { title: "Ayarlar" };

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const [status, devices] = await Promise.all([
    getImportStatus(),
    client.execute("SELECT device_name, created_at FROM push_subscriptions ORDER BY created_at DESC"),
  ]);
  const keys = [
    { name: "Rebrickable API", ok: Boolean(process.env.REBRICKABLE_API_KEY) },
    { name: "Brickset API", ok: Boolean(process.env.BRICKSET_API_KEY) },
    { name: "Turso veritabanı", ok: Boolean(process.env.TURSO_DATABASE_URL) },
    { name: "Web Push (VAPID)", ok: Boolean(process.env.VAPID_PRIVATE_KEY) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ayarlar" />
      <div className="space-y-4">
        <Section title="Görünüm">
          <ThemeSetting />
        </Section>

        <Section title="Bildirimler">
          <p className="mb-3 text-sm text-fg-2">
            Fiyat düşüşleri ve emeklilik uyarıları bu cihaza bildirim olarak gelir. Android&apos;de önce uygulamayı ana ekrana yüklemen önerilir.
          </p>
          <PushSetting publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
          {devices.rows.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-muted">
              {devices.rows.map((d, i) => (
                <li key={i}>
                  • {String(d.device_name || "Cihaz")} — {fmtDate(Number(d.created_at))}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Şifre değiştir" icon={<KeyRound className="size-5 text-muted" />}>
          <PasswordForm />
        </Section>

        <Section title="Katalog ve veriler" icon={<Database className="size-5 text-muted" />}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-fg-2">Parça listesi aktarılan setler</span>
              <span className="font-semibold tabular-nums">
                {fmtNum(status.setsWithInventory)} / {fmtNum(status.setsTotal)}
              </span>
            </div>
            <ProgressBar owned={status.setsWithInventory} total={status.setsTotal} size="sm" />
            <div className="flex justify-between text-xs text-muted">
              <span>
                Tema grupları: {status.themesDone} / {status.themesTotal} (%{pct(status.themesDone, status.themesTotal)})
              </span>
              <span>Son aktarım: {status.lastRun ? fmtDate(status.lastRun) : "—"}</span>
            </div>
            <p className="pt-1 text-xs text-muted">
              Kalan temalar her gece GitHub Actions ile otomatik aktarılır. Aktarılmamış bir temadan set eklersen parça listesi anında Rebrickable&apos;dan çekilir.
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {keys.map((k) => (
              <li key={k.name} className={`rounded-lg border px-3 py-2 ${k.ok ? "border-good/30 text-good" : "border-line text-muted"}`}>
                {k.ok ? "✓" : "○"} {k.name}
                {!k.ok && <span className="block text-[10px]">tanımlı değil (KURULUM.md)</span>}
              </li>
            ))}
          </ul>
          <a href="/api/export/backup" className="btn-secondary mt-4">
            <Download className="size-4" /> Koleksiyon yedeğini indir (JSON)
          </a>
        </Section>

        <Section title="Oturum">
          <form action={logout}>
            <button className="btn-danger">
              <LogOut className="size-4" /> Çıkış yap
            </button>
          </form>
        </Section>

        <p className="px-1 pb-4 text-center text-xs text-muted">
          Katalog verileri ve görseller{" "}
          <a href="https://rebrickable.com" className="underline" target="_blank" rel="noreferrer">
            Rebrickable
          </a>
          , emeklilik tarihleri{" "}
          <a href="https://brickset.com" className="underline" target="_blank" rel="noreferrer">
            Brickset
          </a>{" "}
          kaynaklıdır. LEGO® LEGO Group&apos;un ticari markasıdır; bu uygulama LEGO Group ile bağlantılı değildir.
        </p>
      </div>
    </div>
  );
}
