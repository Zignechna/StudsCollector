import type { Adapter } from "../types";
import { PriceCheckError } from "../types";
import { fetchHtml, genericExtract, parsePrice } from "../parse";

export const hepsiburada: Adapter = {
  site: "hepsiburada",
  async fetch(url) {
    const html = await fetchHtml(url);
    const found = genericExtract(html, "TRY");
    if (found) return found;
    const m = html.match(/"currentPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/) ?? html.match(/data-test-id="price-current-price"[^>]*>([^<]+)</);
    const price = parsePrice(m?.[1]);
    if (price) return { price, currency: "TRY", inStock: !/Tükendi|Stokta yok/i.test(html) };
    throw new PriceCheckError("Hepsiburada sayfasında fiyat bulunamadı");
  },
};
