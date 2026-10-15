import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { searchCatalog } from "@/lib/queries/sets";
import { hasRebrickableKey, searchRemoteSets } from "@/lib/rebrickable";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [], remote: [] });
  const results = await searchCatalog(q, 24);
  let remote: { setNum: string; name: string; year: number; numParts: number; imgUrl: string | null }[] = [];
  // Brand-new sets may not be in the CSV catalog yet: fall back to the live API.
  if (results.length === 0 && hasRebrickableKey()) {
    try {
      remote = (await searchRemoteSets(q)).map((s) => ({
        setNum: s.set_num,
        name: s.name,
        year: s.year,
        numParts: s.num_parts,
        imgUrl: s.set_img_url,
      }));
    } catch {
      remote = [];
    }
  }
  return NextResponse.json({ results, remote });
}
