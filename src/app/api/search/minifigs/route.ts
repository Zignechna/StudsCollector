import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { searchMinifigs } from "@/lib/queries/minifigs";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: await searchMinifigs(q, 24) });
}
