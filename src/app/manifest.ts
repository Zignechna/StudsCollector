import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BrickKasa — LEGO Koleksiyonum",
    short_name: "BrickKasa",
    description: "Kişisel LEGO koleksiyon, parça ve fiyat takibi",
    lang: "tr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0e1014",
    theme_color: "#0a0c0f",
    categories: ["lifestyle", "entertainment", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Set ekle", url: "/ekle", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Koleksiyonlar", url: "/koleksiyonlar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "İstek listesi", url: "/istek", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
