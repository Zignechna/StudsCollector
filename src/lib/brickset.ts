/**
 * Brickset API v3: launch / exit (retirement) dates and subtheme. Server-side only.
 * The free key allows ~100 getSets calls per day, so results are cached on catalog_sets
 * and each set is refreshed at most every REFRESH_DAYS days.
 */
import { client } from "@/db";

const ENDPOINT = "https://brickset.com/api/v3.asmx/getSets";
export const REFRESH_DAYS = 30;

type BricksetSet = {
  number: string;
  numberVariant: number;
  subtheme?: string;
  launchDate?: string | null;
  exitDate?: string | null;
  LEGOCom?: Record<string, { dateFirstAvailable?: string; dateLastAvailable?: string } | undefined>;
};

export function hasBricksetKey() {
  return Boolean(process.env.BRICKSET_API_KEY);
}

const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

function pickDates(s: BricksetSet) {
  const regions = ["DE", "UK", "US", "CA"];
  let launch = day(s.launchDate);
  let exit = day(s.exitDate);
  for (const r of regions) {
    const info = s.LEGOCom?.[r];
    launch ??= day(info?.dateFirstAvailable);
    exit ??= day(info?.dateLastAvailable);
  }
  return { launch, exit };
}

/** Fetches dates from Brickset and stores them. Returns false when skipped or failed. */
export async function refreshBrickset(setNum: string, force = false): Promise<boolean> {
  const key = process.env.BRICKSET_API_KEY;
  if (!key) return false;
  if (!force) {
    const res = await client.execute({ sql: "SELECT brickset_checked_at FROM catalog_sets WHERE set_num = ?", args: [setNum] });
    const checked = Number(res.rows[0]?.brickset_checked_at ?? 0);
    if (checked && Date.now() / 1000 - checked < REFRESH_DAYS * 86400) return true;
  }
  const params = JSON.stringify({ setNumber: setNum, pageSize: 1, extendedData: 0 });
  const url = `${ENDPOINT}?apiKey=${encodeURIComponent(key)}&userHash=&params=${encodeURIComponent(params)}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const json = (await res.json()) as { status: string; sets?: BricksetSet[]; message?: string };
    if (json.status !== "success") {
      console.warn("Brickset:", json.message);
      return false;
    }
    const s = json.sets?.[0];
    const { launch, exit } = s ? pickDates(s) : { launch: null, exit: null };
    await client.execute({
      sql: `UPDATE catalog_sets SET launch_date = ?, exit_date = ?, subtheme = COALESCE(?, subtheme), brickset_checked_at = unixepoch()
            WHERE set_num = ?`,
      args: [launch, exit, s?.subtheme || null, setNum],
    });
    return true;
  } catch (err) {
    console.warn("Brickset request failed:", err);
    return false;
  }
}
