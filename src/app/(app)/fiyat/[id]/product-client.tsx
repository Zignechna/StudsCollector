"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { addListing, deleteAlert, deleteListing, deleteProduct, saveAlert, updateProduct } from "@/app/actions/prices";
import { toast, toastResult } from "@/components/toast";

export function DeleteListingButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <button type="button" className="btn-danger btn-sm" disabled={pending} onClick={() => start(async () => toastResult(await deleteListing(id)))}>
      Sil
    </button>
  ) : (
    <button type="button" className="btn-ghost size-8 p-0" aria-label="Linki sil" onClick={() => setConfirm(true)}>
      <Trash2 className="size-4" />
    </button>
  );
}

export function AddListingForm({ productId }: { productId: number }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-3 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const res = await addListing(productId, String(fd.get("url") ?? ""), String(fd.get("currency") ?? ""));
          toastResult(res);
          if (res.ok) form.reset();
        });
      }}
    >
      <input name="url" type="url" required placeholder="Yeni mağaza linki (https://…)" className="input" aria-label="Mağaza linki" />
      <select name="currency" className="input w-full sm:w-36" defaultValue="" aria-label="Para birimi">
        <option value="">Otomatik</option>
        <option value="TRY">TL</option>
        <option value="EUR">EUR</option>
      </select>
      <button className="btn-secondary shrink-0" disabled={pending}>
        <Plus className="size-4" /> Link ekle
      </button>
    </form>
  );
}

const ALERT_INFO: Record<string, { label: string; hint: string; unit?: string }> = {
  any_drop: { label: "Herhangi bir düşüş", hint: "Herhangi bir mağazada fiyat düştüğünde" },
  below: { label: "Belirli fiyatın altına", hint: "En iyi fiyat (TL) bu değerin altına indiğinde", unit: "TL" },
  percent: { label: "Yüzde düşüş", hint: "Fiyat, en son bildirilen/ilk fiyata göre bu oranda düştüğünde", unit: "%" },
  all_time_low: { label: "En düşük fiyat rekoru", hint: "Fiyat şimdiye kadarki en düşük seviyeye indiğinde" },
};

export function AlertsEditor({ productId, alerts }: { productId: number; alerts: { id: number; type: string; value: number | null }[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(ALERT_INFO).map(([type, info]) => {
        const alert = alerts.find((a) => a.type === type);
        return (
          <form
            key={type}
            className={`card flex flex-col gap-2 p-4 ${alert ? "border-accent/50" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get("value");
              start(async () => toastResult(await saveAlert(productId, type, v ? Number(String(v).replace(",", ".")) : null)));
            }}
          >
            <div className="flex items-center gap-2">
              <Bell className={`size-4 ${alert ? "text-accent" : "text-muted"}`} />
              <span className="font-semibold">{info.label}</span>
              {alert && <span className="badge bg-accent-soft text-accent">Açık</span>}
            </div>
            <p className="text-xs text-muted">{info.hint}. Aynı düşüş için tekrar bildirim gönderilmez.</p>
            <div className="mt-auto flex items-center gap-2">
              {info.unit && (
                <div className="relative">
                  <input name="value" inputMode="decimal" defaultValue={alert?.value ?? ""} className="input h-9 w-32 pr-8" aria-label={info.label} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{info.unit}</span>
                </div>
              )}
              <button className="btn-secondary btn-sm h-9" disabled={pending}>
                {alert ? "Güncelle" : "Aç"}
              </button>
              {alert && (
                <button type="button" className="btn-ghost btn-sm h-9" disabled={pending} onClick={() => start(async () => toastResult(await deleteAlert(alert.id)))}>
                  Kapat
                </button>
              )}
            </div>
          </form>
        );
      })}
    </div>
  );
}

export function ProductEditor({ product }: { product: { id: number; name: string; imgUrl: string | null; setNum: string | null; notes: string | null } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => toastResult(await updateProduct(product.id, fd)));
      }}
    >
      <div>
        <label className="label" htmlFor="pe-name">
          Ad
        </label>
        <input id="pe-name" name="name" defaultValue={product.name} required className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pe-set">
            LEGO seti
          </label>
          <input id="pe-set" name="setNum" defaultValue={product.setNum ?? ""} className="input font-mono" />
        </div>
        <div>
          <label className="label" htmlFor="pe-img">
            Görsel URL
          </label>
          <input id="pe-img" name="imgUrl" defaultValue={product.imgUrl ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pe-notes">
          Not
        </label>
        <input id="pe-notes" name="notes" defaultValue={product.notes ?? ""} className="input" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={pending}>
          Kaydet
        </button>
        {confirm ? (
          <button
            type="button"
            className="btn-danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteProduct(product.id);
                if (res.ok) {
                  toast("Ürün silindi.");
                  router.push("/fiyat");
                }
              })
            }
          >
            Evet, sil
          </button>
        ) : (
          <button type="button" className="btn-ghost text-bad" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Ürünü sil
          </button>
        )}
      </div>
    </form>
  );
}
