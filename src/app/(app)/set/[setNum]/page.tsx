import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink } from "lucide-react";
import { getSet } from "@/lib/queries/sets";
import { getThemeTree } from "@/lib/queries/themes";
import {
  getBuildModes,
  getCollectionMembership,
  getInventory,
  getMissingMap,
  getOwnedCopies,
  getSetExtra,
  getSetMinifigs,
} from "@/lib/queries/set-detail";
import { ensureCatalogSet, ensureInventory, hasRebrickableKey } from "@/lib/rebrickable";
import { refreshBrickset } from "@/lib/brickset";
import { fmtNum, setNumDisplay } from "@/lib/format";
import { SetImage } from "@/components/set-card";
import { Tabs } from "@/components/ui";
import { SetActions } from "./set-actions";
import { RetirementPanel } from "./retirement-panel";
import { OwnedCopies } from "./owned-copies";
import { InventoryPanel } from "./inventory-panel";
import { BuildModesPanel } from "./build-modes-panel";
import { MinifigsPanel } from "./minifigs-panel";
import { AlternatesPanel } from "./alternates-panel";
import { PricePanel } from "./price-panel";

type Props = { params: Promise<{ setNum: string }>; searchParams: Promise<{ tab?: string; pool?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { setNum } = await params;
  const set = await getSet(decodeURIComponent(setNum));
  return { title: set ? `${set.name} (${setNumDisplay(set.setNum)})` : "Set" };
}

export default async function SetPage({ params, searchParams }: Props) {
  const [{ setNum: raw }, sp] = await Promise.all([params, searchParams]);
  const setNum = decodeURIComponent(raw);
  let set = await getSet(setNum);
  if (!set && (await ensureCatalogSet(setNum))) set = await getSet(setNum);
  if (!set) notFound();

  // Owned / wished sets keep their cached data fresh (inventory once, Brickset every 30 days).
  if (set.ownedCount > 0 || set.inWishlist) {
    await Promise.allSettled([refreshBrickset(set.setNum), set.ownedCount > 0 ? ensureInventory(set.setNum) : Promise.resolve()]);
    set = (await getSet(setNum))!;
  }

  const tab = ["parts", "figs", "modes", "alt", "price"].includes(sp.tab ?? "") ? sp.tab! : "parts";
  const [tree, extra, copies, minifigs, modes, collections] = await Promise.all([
    getThemeTree(),
    getSetExtra(set.setNum),
    getOwnedCopies(set.setNum),
    getSetMinifigs(set.setNum),
    getBuildModes(set.setNum),
    getCollectionMembership(set.setNum),
  ]);
  const path = set.themeId != null ? tree.path(set.themeId) : [];
  const needsInventory = tab === "parts" || tab === "modes";
  const [inventory, missingMap] = needsInventory
    ? await Promise.all([getInventory(set.setNum), getMissingMap(set.setNum)])
    : [[], {}];
  const base = `/set/${encodeURIComponent(set.setNum)}`;
  const owned = set.ownedCount > 0;

  return (
    <div>
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted" aria-label="Konum">
        <Link href="/koleksiyonlar" className="hover:text-fg">
          Koleksiyonlar
        </Link>
        {path.map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            <Link href={`/koleksiyonlar/tema/${p.id}`} className="hover:text-fg">
              {p.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-8">
        <div className={owned ? "" : "locked"}>
          <SetImage src={set.imgUrl} alt={set.name} className={`aspect-[4/3] w-full rounded-xl ring-1 ${owned ? "ring-good/50" : "ring-line"}`} />
        </div>

        <div className="min-w-0">
          <div className="font-mono text-sm text-muted">{set.setNum}</div>
          <h1 lang="en" className="page-title mt-0.5 text-balance">{set.name}</h1>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Yıl</dt>
              <dd className="font-semibold">{set.year ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Parça</dt>
              <dd className="font-semibold tabular-nums">{fmtNum(set.numParts)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Minifigür</dt>
              <dd className="font-semibold tabular-nums">{minifigs.reduce((a, m) => a + m.quantity, 0)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Tema</dt>
              <dd className="truncate font-semibold">{extra.subtheme ? `${set.themeName} · ${extra.subtheme}` : (set.themeName ?? "—")}</dd>
            </div>
          </dl>

          <SetActions
            setNum={set.setNum}
            name={set.name}
            ownedCount={set.ownedCount}
            inWishlist={set.inWishlist}
            collections={collections}
          />

          <RetirementPanel set={set} checkedAt={extra.bricksetCheckedAt} />

          {owned && <OwnedCopies setNum={set.setNum} copies={copies} modes={modes.map((m) => ({ id: m.id, name: m.name }))} />}

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            <a
              href={`https://rebrickable.com/sets/${encodeURIComponent(set.setNum)}/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-fg"
            >
              Rebrickable <ExternalLink className="size-3" />
            </a>
            <a
              href={`https://brickset.com/sets/${encodeURIComponent(set.setNum)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-fg"
            >
              Brickset <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Tabs
          active={tab}
          items={[
            { key: "parts", label: "Parçalar", href: base },
            { key: "figs", label: "Minifigürler", href: `${base}?tab=figs`, count: minifigs.length },
            { key: "modes", label: "Modlar", href: `${base}?tab=modes`, count: modes.length },
            { key: "alt", label: "Alternatif buildler", href: `${base}?tab=alt` },
            { key: "price", label: "Fiyatlar", href: `${base}?tab=price` },
          ]}
        />
        {tab === "parts" && (
          <InventoryPanel
            setNum={set.setNum}
            inventory={inventory}
            copies={copies}
            missingMap={missingMap}
            modes={modes}
            inventoryStatus={extra.inventoryStatus}
            hasApiKey={hasRebrickableKey()}
          />
        )}
        {tab === "figs" && <MinifigsPanel minifigs={minifigs} />}
        {tab === "modes" && <BuildModesPanel setNum={set.setNum} modes={modes} inventory={inventory} />}
        {tab === "alt" && <AlternatesPanel setNum={set.setNum} fetchedAt={extra.alternatesFetchedAt} pool={sp.pool === "surplus" ? "surplus" : "total"} />}
        {tab === "price" && <PricePanel setNum={set.setNum} name={set.name} imgUrl={set.imgUrl} />}
      </div>
    </div>
  );
}
