// Adding a new store = add one adapter file + register it here (and in ../sites.ts).
import type { Adapter } from "../types";
import type { SiteId } from "../sites";
import { amazonDe, amazonTr } from "./amazon";
import { generic } from "./generic";
import { hepsiburada } from "./hepsiburada";
import { legoDe, legoTr } from "./lego";
import { muellerDe } from "./mueller";
import { n11 } from "./n11";
import { trendyol } from "./trendyol";

const adapters: Adapter[] = [legoTr, legoDe, amazonTr, amazonDe, hepsiburada, trendyol, n11, muellerDe, generic];

export function adapterFor(site: SiteId | string): Adapter {
  return adapters.find((a) => a.site === site) ?? generic;
}
