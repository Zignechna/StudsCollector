import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { exportUserData } from "@/lib/backup";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const data = await exportUserData();
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="brickkasa-yedek-${date}.json"`,
    },
  });
}
