import type { Adapter } from "../types";
import { PriceCheckError } from "../types";
import { fetchHtml, genericExtract, parsePrice } from "../parse";

export const trendyol: Adapter = {
  site: "trendyol",
  async fetch(url) {
    const html = await fetchHtml(url);
    const found = genericExtract(html, "TRY");
    if (found) return found;
    const m = html.match(/"sellingPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/) ?? html.match(/"discountedPrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/);
    const price = parsePrice(m?.[1]);
    if (price) return { price, currency: "TRY", inStock: !/"inStock"\s*:\s*false/.test(html) };
    throw new PriceCheckError("Trendyol sayfasında fiyat bulunamadı");
  },
};
