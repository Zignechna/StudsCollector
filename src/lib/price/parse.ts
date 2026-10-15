import { PriceCheckError } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const BROWSER_HEADERS = (lang: string) => ({
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": lang,
  "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
});

/**
 * Downloads a page with curl (many shops reject Node's fetch TLS fingerprint but accept curl).
 * Falls back to fetch when curl is not installed.
 */
async function download(url: string, lang: string): Promise<{ status: number; body: string }> {
  const { execFile } = await import("node:child_process");
  const headers = Object.entries(BROWSER_HEADERS(lang)).flatMap(([k, v]) => ["-H", `${k}: ${v}`]);
  const marker = "\n__BK_STATUS__:";
  try {
    const out = await new Promise<string>((resolve, reject) => {
      execFile(
        "curl",
        ["-sSL", "--compressed", "--max-time", "25", "--max-redirs", "5", ...headers, "-w", `${marker}%{http_code}`, url],
        { maxBuffer: 25 * 1024 * 1024, encoding: "utf8" },
        (err, stdout) => (err && !stdout ? reject(err) : resolve(stdout)),
      );
    });
    const idx = out.lastIndexOf("__BK_STATUS__:");
    return { status: Number(out.slice(idx + 14).trim()), body: out.slice(0, idx) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw new PriceCheckError(`Bağlantı hatası: ${(err as Error).message}`);
    const res = await fetch(url, { headers: BROWSER_HEADERS(lang), redirect: "follow", signal: AbortSignal.timeout(25_000) });
    return { status: res.status, body: await res.text() };
  }
}

export async function fetchHtml(url: string, lang = "tr-TR,tr;q=0.9,en;q=0.6"): Promise<string> {
  const res = await download(url, lang);
  if (res.status === 403 || res.status === 429 || res.status === 503) {
    throw new PriceCheckError(`Site isteği engelledi (HTTP ${res.status})`);
  }
  if (res.status === 404) throw new PriceCheckError("Ürün sayfası bulunamadı (404)");
  if (res.status < 200 || res.status >= 300) throw new PriceCheckError(`HTTP ${res.status}`);
  const html = res.body;
  if (/captcha|robot check|are you a human|validateCaptcha/i.test(html.slice(0, 20000)) && !/application\/ld\+json/.test(html)) {
    throw new PriceCheckError("Site robot doğrulaması istedi");
  }
  return html;
}

/** Parses "1.299,99 TL", "€ 129,99", "1,299.99", "129.99" and numbers. */
export function parsePrice(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) && input > 0 ? input : null;
  if (typeof input !== "string") return null;
  let s = input.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // comma is the decimal separator (TR / DE style)
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, "");
  } else if (lastDot !== -1 && s.length - lastDot - 1 === 3 && s.split(".").length > 1 && !/\.\d{1,2}$/.test(s)) {
    // "1.299" -> thousands separator
    s = s.replace(/\./g, "");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

type JsonLdOffer = { price?: unknown; lowPrice?: unknown; priceCurrency?: string; availability?: string; offers?: unknown };

function collectNodes(node: unknown, out: Record<string, unknown>[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => collectNodes(n, out));
  const obj = node as Record<string, unknown>;
  out.push(obj);
  if (obj["@graph"]) collectNodes(obj["@graph"], out);
  if (obj.mainEntity) collectNodes(obj.mainEntity, out);
}

/** Reads schema.org Product/Offer data from JSON-LD blocks. */
export function fromJsonLd(html: string): { price: number | null; currency: string | null; inStock: boolean | null } | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(b[1].trim().replace(/^<!--|-->$/g, ""));
    } catch {
      continue;
    }
    const nodes: Record<string, unknown>[] = [];
    collectNodes(data, nodes);
    const product = nodes.find((n) => {
      const t = n["@type"];
      return t === "Product" || (Array.isArray(t) && t.includes("Product"));
    });
    if (!product) continue;
    let offers = product.offers as JsonLdOffer | JsonLdOffer[] | undefined;
    if (Array.isArray(offers)) offers = offers[0];
    if (offers && (offers as JsonLdOffer).offers) {
      const inner = (offers as JsonLdOffer).offers;
      offers = (Array.isArray(inner) ? inner[0] : inner) as JsonLdOffer;
    }
    if (!offers) continue;
    const o = offers as JsonLdOffer;
    const price = parsePrice(o.price ?? o.lowPrice);
    const availability = typeof o.availability === "string" ? o.availability : "";
    return {
      price,
      currency: o.priceCurrency ?? null,
      inStock: availability ? /InStock|LimitedAvailability|PreOrder|OnlineOnly/i.test(availability) : null,
    };
  }
  return null;
}

export function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${name}["']`, "i");
    const m = html.match(re) ?? html.match(re2);
    if (m) return m[1];
  }
  return null;
}

/** Generic strategy: JSON-LD first, then common meta tags. */
export function genericExtract(html: string, currency: "TRY" | "EUR") {
  const ld = fromJsonLd(html);
  if (ld?.price) {
    return { price: ld.price, currency: (ld.currency === "EUR" ? "EUR" : ld.currency === "TRY" ? "TRY" : currency) as "TRY" | "EUR", inStock: ld.inStock ?? true };
  }
  const metaPrice = parsePrice(metaContent(html, ["product:price:amount", "og:price:amount", "price"]));
  if (metaPrice) {
    const avail = metaContent(html, ["product:availability", "og:availability", "availability"]);
    return { price: metaPrice, currency, inStock: avail ? !/out ?of ?stock|oos|tükendi/i.test(avail) : true };
  }
  return null;
}
