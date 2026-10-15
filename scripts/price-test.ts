/** Manually test adapters: npx tsx scripts/price-test.ts <url> [url...] */
import { adapterFor } from "../src/lib/price/adapters";
import { detectSite } from "../src/lib/price/sites";

async function main() {
  for (const url of process.argv.slice(2)) {
    const site = detectSite(url);
    try {
      const r = await adapterFor(site.id).fetch(url);
      console.log(site.id, "→", r);
    } catch (err) {
      console.log(site.id, "✗", (err as Error).message);
    }
  }
}
main();
