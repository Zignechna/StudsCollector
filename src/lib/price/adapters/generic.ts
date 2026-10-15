import type { Adapter } from "../types";
import { PriceCheckError } from "../types";
import { fetchHtml, genericExtract } from "../parse";

/** Fallback for any other shop that publishes schema.org product data. */
export const generic: Adapter = {
  site: "other",
  async fetch(url) {
    const html = await fetchHtml(url);
    const found = genericExtract(html, "TRY");
    if (found) return found;
    throw new PriceCheckError("Sayfada fiyat bilgisi bulunamadı");
  },
};
