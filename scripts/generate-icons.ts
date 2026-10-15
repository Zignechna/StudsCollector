/** Generates PWA / favicon PNGs from the brick logo. Run: npm run icons:generate */
import fs from "node:fs";
import sharp from "sharp";

const brick = (size: number, pad: number, bg: string | null, radius: number) => {
  const inner = size - pad * 2;
  const s = inner / 64;
  const g = `<g transform="translate(${pad},${pad}) scale(${s})">
    <rect x="4" y="18" width="56" height="40" rx="7" fill="#f5b800"/>
    <rect x="12" y="8" width="16" height="14" rx="4" fill="#f5b800"/>
    <rect x="36" y="8" width="16" height="14" rx="4" fill="#f5b800"/>
    <rect x="12" y="8" width="16" height="5" rx="2.5" fill="#ffd24d"/>
    <rect x="36" y="8" width="16" height="5" rx="2.5" fill="#ffd24d"/>
    <rect x="4" y="18" width="56" height="7" rx="3.5" fill="#ffd24d" opacity=".7"/>
    <path d="M18 34h28v6H18z" fill="#1b1500" opacity=".85"/>
    <path d="M18 44h18v6H18z" fill="#1b1500" opacity=".85"/>
  </g>`;
  const background = bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${background}${g}</svg>`);
};

async function main() {
  fs.mkdirSync("public/icons", { recursive: true });
  const jobs: [string, Buffer][] = [
    ["public/icons/icon-192.png", brick(192, 28, "#0e1014", 40)],
    ["public/icons/icon-512.png", brick(512, 72, "#0e1014", 108)],
    // maskable: full-bleed background, logo inside the 80% safe zone
    ["public/icons/maskable-512.png", brick(512, 128, "#0e1014", 0)],
    ["public/icons/maskable-192.png", brick(192, 48, "#0e1014", 0)],
    ["public/icons/apple-touch-icon.png", brick(180, 26, "#0e1014", 0)],
    ["public/icons/favicon-32.png", brick(32, 2, null, 0)],
    ["public/icons/badge-96.png", brick(96, 8, null, 0)],
  ];
  for (const [file, svg] of jobs) {
    await sharp(svg).png().toFile(file);
    console.log("wrote", file);
  }
}

main();
