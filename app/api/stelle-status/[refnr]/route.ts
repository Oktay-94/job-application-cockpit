import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Status EINER Stelle per refnr — schlanke Lesequelle fürs Client-Polling nach
// dem Senden (Zeile aus der Versandfertig-Queue nehmen, sobald status nicht mehr
// 'anschreiben_erstellt' ist). Nur SELECT, kein UPDATE.
// Antwort-Vertrag:
//   { status: "<wert>" }  -> Stelle existiert (status kann NULL sein -> null)
//   404 { fehler: ... }   -> refnr unbekannt (wie in den Vorbild-Routen)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ refnr: string }> }
) {
  const { refnr } = await params;

  const { rows } = await pool.query<{ status: string | null }>(
    `SELECT status FROM stellen WHERE refnr = $1`,
    [refnr]
  );
  if (!rows[0]) {
    return NextResponse.json({ fehler: "Stelle nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ status: rows[0].status });
}
