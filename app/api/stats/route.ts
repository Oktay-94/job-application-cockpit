import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await pool.query(
      "SELECT quelle, status, count(*)::int AS anzahl FROM stellen GROUP BY 1, 2 ORDER BY 1, 2"
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("DB-Fehler:", err);
    return NextResponse.json({ fehler: "Datenbank nicht erreichbar" }, { status: 500 });
  }
}
