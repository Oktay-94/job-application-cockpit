import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";

const AKTIONEN = ["uebernehmen", "verwerfen"] as const;
type Aktion = (typeof AKTIONEN)[number];

interface VorschlagBody {
  aktion: Aktion;
  refnr: string;
}

function parseBody(body: unknown): VorschlagBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { aktion, refnr } = body as Record<string, unknown>;
  if (!AKTIONEN.includes(aktion as Aktion)) return null;
  if (typeof refnr !== "string" || refnr.length === 0 || refnr.length > 100) {
    return null;
  }
  return { aktion: aktion as Aktion, refnr };
}

// Übernehmen: das Fuzzy-Vorschlag-JSON (vom n8n-Tracker geschrieben) in die
// echten Rückmeldungs-Spalten kopieren und den Vorschlag löschen. Die WHERE-
// Klausel ist die Validierung: greift nur, solange ein offener Vorschlag
// vorliegt → rowCount 0 = "nichts zu tun".
async function uebernehmen(refnr: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stellen
        SET rueckmeldung = rueckmeldung_vorschlag->>'kategorie',
            rueckmeldung_am = COALESCE(
              NULLIF(rueckmeldung_vorschlag->>'empfangen_am', '')::timestamptz,
              rueckmeldung_vorschlag_am,
              now()
            ),
            rueckmeldung_zusammenfassung = rueckmeldung_vorschlag->>'zusammenfassung',
            gespraech_am = NULLIF(rueckmeldung_vorschlag->>'gespraech_am', '')::timestamptz,
            gespraech_ort = rueckmeldung_vorschlag->>'gespraech_ort',
            rueckmeldung_vorschlag = NULL,
            rueckmeldung_vorschlag_am = NULL
      WHERE refnr = $1
        AND rueckmeldung_vorschlag IS NOT NULL
        AND rueckmeldung_vorschlag->>'kategorie' IS NOT NULL`,
    [refnr]
  );
  return rowCount ?? 0;
}

async function verwerfen(refnr: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stellen
        SET rueckmeldung_vorschlag = NULL,
            rueckmeldung_vorschlag_am = NULL
      WHERE refnr = $1
        AND rueckmeldung_vorschlag IS NOT NULL`,
    [refnr]
  );
  return rowCount ?? 0;
}

export async function POST(request: Request) {
  if (istDemoModus()) return demoAntwort();
  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ ok: false, grund: "Ungültige Anfrage" }, { status: 400 });
  }

  try {
    const betroffen =
      body.aktion === "uebernehmen"
        ? await uebernehmen(body.refnr)
        : await verwerfen(body.refnr);

    if (betroffen === 0) {
      return NextResponse.json(
        { ok: false, grund: "Kein offener Vorschlag für diese Stelle" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Rückmeldung-Vorschlag-UPDATE fehlgeschlagen:", (err as Error).name);
    return NextResponse.json({ ok: false, grund: "Datenbankfehler" }, { status: 500 });
  }
}
