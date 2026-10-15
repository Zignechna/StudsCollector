import type { Adapter } from "../types";
import { PriceCheckError } from "../types";
import { fetchHtml, genericExtract, parsePrice } from "../parse";

// lego.com (DE) and lego.tr product pages ship schema.org JSON-LD with price and availability.
// lego.com sits behind bot protection that occasionally answers 403; the listing is then retried next run.
function makeLego(site: "lego_tr" | "lego_de", currency: "TRY" | "EUR", lang: string): Adapter {
  return {
    site,
    async fetch(url) {
      const html = await fetchHtml(url, lang);
      const found = genericExtract(html, currency);
      // JSON-LD availability is reliable; page-wide text also contains other products, so it is not used.
      if (found) return found;
      const m = html.match(/"price"\s*:\s*\{[^}]*"centAmount"\s*:\s*(\d+)/);
      if (m) return { price: Number(m[1]) / 100, currency, inStock: true };
      const m2 = html.match(/data-test="product-price"[^>]*>([^<]+)</);
      const price = parsePrice(m2?.[1]);
      if (price) return { price, currency, inStock: true };
      throw new PriceCheckError("LEGO sayfasında fiyat bulunamadı");
    },
  };
}

export const legoTr = makeLego("lego_tr", "TRY", "tr-TR,tr;q=0.9");
export const legoDe = makeLego("lego_de", "EUR", "de-DE,de;q=0.9");
