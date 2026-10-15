import type { Adapter } from "../types";
import { PriceCheckError } from "../types";
import { fetchHtml, genericExtract, parsePrice } from "../parse";

export const muellerDe: Adapter = {
  site: "mueller_de",
  async fetch(url) {
    const html = await fetchHtml(url, "de-DE,de;q=0.9");
    const found = genericExtract(html, "EUR");
    if (found) return { ...found, currency: "EUR" };
    const m = html.match(/"price"\s*:\s*"?([\d.,]+)"?/) ?? html.match(/class="[^"]*product-price[^"]*"[^>]*>([^<]+)</);
    const price = parsePrice(m?.[1]);
    if (price) return { price, currency: "EUR", inStock: !/nicht verfügbar|ausverkauft/i.test(html) };
    throw new PriceCheckError("Müller sayfasında fiyat bulunamadı");
  },
};
