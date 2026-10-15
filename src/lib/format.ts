const nf = new Intl.NumberFormat("tr-TR");
const df = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });
const mf = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });

export const fmtNum = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));

export function fmtDate(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : df.format(d);
}

export function fmtMonth(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : mf.format(d);
}

export function fmtMoney(value: number | null | undefined, currency = "TRY") {
  if (value == null) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export const pct = (owned: number, total: number) => (total > 0 ? Math.round((owned / total) * 100) : 0);

export function relativeDays(date: string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}

export function humanizeDays(days: number) {
  const abs = Math.abs(days);
  const text = abs < 45 ? `${abs} gün` : abs < 365 ? `${Math.round(abs / 30)} ay` : `${(abs / 365).toFixed(1).replace(".", ",")} yıl`;
  return days >= 0 ? `${text} kaldı` : `${text} önce`;
}

export function setNumDisplay(setNum: string) {
  return setNum.endsWith("-1") ? setNum.slice(0, -2) : setNum;
}

/** Accepts "10300", "10300-1" or " 10300 - 2 " and returns "10300-1" style numbers. */
export function normalizeSetNum(input: string) {
  const v = input.trim().replace(/\s+/g, "");
  if (!v) return v;
  if (/^[^-]+-\d+$/.test(v)) return v;
  return `${v}-1`;
}

/** Current Unix time in seconds (kept outside components for the react purity lint rule). */
export const nowSeconds = () => Math.floor(Date.now() / 1000);
