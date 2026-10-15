import type { RawParams } from "./filters";

/** Rebuilds a URL from current search params with a patch applied (server-side helper). */
export function hrefWith(path: string, params: RawParams, patch: Record<string, string | number | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, Array.isArray(v) ? v[0] : v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") sp.delete(k);
    else sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
