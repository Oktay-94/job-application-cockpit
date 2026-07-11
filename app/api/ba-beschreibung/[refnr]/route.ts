import { NextResponse } from "next/server";
import pool from "@/lib/db";

// === KONFIG: BA-Jobsuche-API. 'jobboerse-jobsuche' ist der ÖFFENTLICHE
// BA-API-Key (kein Secret, in der BA-Doku dokumentiert) — hier oben als
// Konstante, nicht im Code verstreut. ===
const BA_API_KEY = "jobboerse-jobsuche";
const BA_JOBDETAILS_BASE =
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/";
const MAX_CHARS = 8000; // Anzeige-Cap

// DOM/Entities aus dem API-Text raus, Whitespace normalisieren — wie der
// n8n-Node "Beschreibung aufbereiten" es macht.
function plainText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

// Live-Nachladen der BA-Stellenbeschreibung (nur Anzeige, kein DB-Write).
// Antwort-Vertrag — immer 200 ausser "Stelle unbekannt" (404):
//   { text: "<Volltext>" }  -> Anzeige vorhanden
//   { text: "" }            -> kein Text (tote/abgelaufene Anzeige ODER
//                              API nicht erreichbar) -> UI: "nicht mehr verfuegbar"
// Bewusst kein 500: eine tote BA-Anzeige ist der Normalfall, kein Fehler.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ refnr: string }> }
) {
  const { refnr } = await params;

  const { rows } = await pool.query<{ refnr: string }>(
    `SELECT refnr FROM stellen WHERE refnr = $1`,
    [refnr]
  );
  if (!rows[0]) {
    return NextResponse.json({ fehler: "Stelle nicht gefunden" }, { status: 404 });
  }

  // refnr ist der Schluessel der BA-API, base64-kodiert im Pfad.
  const encNr = Buffer.from(refnr, "utf8").toString("base64");
  try {
    const res = await fetch(`${BA_JOBDETAILS_BASE}${encNr}`, {
      headers: { "X-API-Key": BA_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) {
      // 404 o.ae. = Anzeige offline/zurueckgezogen -> leer, kein Crash.
      return NextResponse.json({ text: "" });
    }
    const data: { stellenangebotsBeschreibung?: string } = await res.json();
    const text = plainText((data.stellenangebotsBeschreibung || "").trim());
    return NextResponse.json({ text });
  } catch {
    // Netzwerkfehler/Timeout -> wie "nicht verfuegbar" behandeln, kein 500.
    return NextResponse.json({ text: "" });
  }
}
