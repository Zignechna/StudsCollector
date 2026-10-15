import { AlertTriangle } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function StorageBanner() {
  const row = await db.query.appSettings.findFirst({ where: eq(schema.appSettings.key, "storage_warning") });
  if (!row) return null;
  let size = "";
  try {
    const v = JSON.parse(row.value) as { size: number; limit: number };
    size = ` (${(v.size / 1024 ** 3).toFixed(2)} GB / ${(v.limit / 1024 ** 3).toFixed(2)} GB)`;
  } catch {}
  return (
    <div className="border-b border-warn/30 bg-warn-soft">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-2 text-xs font-medium text-warn lg:px-6">
        <AlertTriangle className="size-4 shrink-0" />
        Veritabanı ücretsiz depolama limitine yaklaştı{size}. Katalog aktarımı durduruldu; uygulama çalışmaya devam ediyor.
      </div>
    </div>
  );
}
