import type { SiteId } from "./sites";

export type PriceResult = {
  price: number | null;
  currency: "TRY" | "EUR";
  inStock: boolean;
};

/** One adapter per store. Each adapter is independent: when a site changes, only its adapter breaks. */
export type Adapter = {
  site: SiteId;
  fetch: (url: string) => Promise<PriceResult>;
};

/** Thrown when a page could not be read reliably (blocked, captcha, layout changed). */
export class PriceCheckError extends Error {}
