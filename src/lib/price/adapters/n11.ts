import type { Adapter } from "../types";
import { PriceCheckError } from "../types";
import { fetchHtml, genericExtract, parsePrice } from "../parse";

export const n11: Adapter = {
  site: "n11",
  async fetch(url) {
    const html = await fetchHtml(url);
    const found = genericExtract(html, "TRY");
    if (found) return found;
    const m = html.match(/class="newPrice"[\s\S]{0,200}?<ins[^>]*>([^<]+)</) ?? html.match(/"displayPrice"\s*:\s*"?([\d.,]+)/);
    const price = parsePrice(m?.[1]);
    if (price) return { price, currency: "TRY", inStock: !/Tükendi|stokta yok/i.test(html) };
    throw new PriceCheckError("n11 sayfasında fiyat bulunamadı");
  },
};
