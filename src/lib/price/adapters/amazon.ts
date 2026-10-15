import type { Adapter } from "../types";
import { PriceCheckError } from "../types";
import { fetchHtml, parsePrice } from "../parse";

// Amazon does not use JSON-LD for prices; read the visible price block.
function makeAmazon(site: "amazon_tr" | "amazon_de", currency: "TRY" | "EUR", lang: string): Adapter {
  return {
    site,
    async fetch(url) {
      const html = await fetchHtml(url, lang);
      if (/api-services-support@amazon\.com|Type the characters you see/i.test(html)) {
        throw new PriceCheckError("Amazon robot doğrulaması istedi");
      }
      const block =
        html.match(/id="corePrice(?:Display_desktop)?_feature_div"[\s\S]{0,4000}?<span class="a-offscreen">([^<]+)<\/span>/)?.[1] ??
        html.match(/id="apex_desktop"[\s\S]{0,4000}?<span class="a-offscreen">([^<]+)<\/span>/)?.[1] ??
        html.match(/"priceAmount"\s*:\s*([\d.]+)/)?.[1] ??
        html.match(/id="priceblock_(?:ourprice|dealprice)"[^>]*>([^<]+)</)?.[1];
      const price = parsePrice(block);
      const availability = html.match(/id="availability"[\s\S]{0,600}?<span[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "";
      const outOfStock = /(Şu anda mevcut değil|Stokta yok|Derzeit nicht verfügbar|Currently unavailable)/i.test(availability);
      if (!price) {
        if (outOfStock) return { price: null, currency, inStock: false };
        throw new PriceCheckError("Amazon sayfasında fiyat bulunamadı");
      }
      return { price, currency, inStock: !outOfStock };
    },
  };
}

export const amazonTr = makeAmazon("amazon_tr", "TRY", "tr-TR,tr;q=0.9");
export const amazonDe = makeAmazon("amazon_de", "EUR", "de-DE,de;q=0.9");
