import { NextResponse } from "next/server";
import { client } from "@/db";
import { isAuthenticated } from "@/lib/auth";

// Rebrickable-compatible parts CSV (Part, Color, Quantity) of all missing parts.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  const res = await client.execute(
    "SELECT part_num, color_id, SUM(quantity) AS qty FROM missing_parts GROUP BY part_num, color_id ORDER BY part_num",
  );
  const csv = ["Part,Color,Quantity", ...res.rows.map((r) => `${r.part_num},${r.color_id},${r.qty}`)].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="brickkasa-eksik-parcalar.csv"',
    },
  });
}
