// Site registry shared by the UI and the price checker (no network code here).

export type SiteId =
  | "amazon_tr"
  | "lego_tr"
  | "hepsiburada"
  | "trendyol"
  | "n11"
  | "mueller_de"
  | "amazon_de"
  | "lego_de"
  | "other";

export const SITES: { id: SiteId; label: string; currency: "TRY" | "EUR"; hosts: RegExp }[] = [
  { id: "lego_tr", label: "LEGO Türkiye", currency: "TRY", hosts: /(^|\.)lego\.tr$/i },
  { id: "amazon_tr", label: "Amazon.com.tr", currency: "TRY", hosts: /(^|\.)amazon\.com\.tr$/i },
  { id: "hepsiburada", label: "Hepsiburada", currency: "TRY", hosts: /(^|\.)hepsiburada\.com$/i },
  { id: "trendyol", label: "Trendyol", currency: "TRY", hosts: /(^|\.)trendyol\.com$/i },
  { id: "n11", label: "n11", currency: "TRY", hosts: /(^|\.)n11\.com$/i },
  { id: "mueller_de", label: "Müller", currency: "EUR", hosts: /(^|\.)mueller\.de$/i },
  { id: "amazon_de", label: "Amazon.de", currency: "EUR", hosts: /(^|\.)amazon\.de$/i },
  { id: "lego_de", label: "LEGO.de", currency: "EUR", hosts: /(^|\.)lego\.com$/i },
];

/** Detects the site from a product URL. lego.com is split by locale path (/tr-tr vs /de-de). */
export function detectSite(url: string): { id: SiteId; currency: "TRY" | "EUR" } {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { id: "other", currency: "TRY" };
  }
  // lego.com/tr-tr redirects to the Turkish store at lego.tr
  if (/(^|\.)lego\.com$/i.test(u.hostname)) {
    return /^\/tr-tr/i.test(u.pathname) ? { id: "lego_tr", currency: "TRY" } : { id: "lego_de", currency: "EUR" };
  }
  const s = SITES.find((x) => x.id !== "lego_de" && x.hosts.test(u.hostname));
  return s ? { id: s.id, currency: s.currency } : { id: "other", currency: "TRY" };
}

export function siteLabel(id: string) {
  return SITES.find((s) => s.id === id)?.label ?? "Diğer";
}
