import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";

// speichern  = erkundete Beschreibung als Vorschlag ablegen (erkundung_vorschlag)
// uebernehmen = Vorschlag → beschreibung übernehmen, Vorschlag löschen
// verwerfen   = Vorschlag löschen
const AKTIONEN = ["speichern", "uebernehmen", "verwerfen"] as const;
type Aktion = (typeof AKTIONEN)[number];

interface Body {
  aktion: Aktion;
  refnr: string;
  text?: string;
}

const MAX_TEXT = 40_000;

function parseBody(body: unknown): Body | null {
  if (typeof body !== "object" || body === null) return null;
  const { aktion, refnr, text } = body as Record<string, unknown>;
  if (!AKTIONEN.includes(aktion as Aktion)) return null;
  if (typeof refnr !== "string" || refnr.length === 0 || refnr.length > 100) return null;
  if (aktion === "speichern") {
    if (typeof text !== "string" || text.trim().length === 0 || text.length > MAX_TEXT) return null;
    return { aktion, refnr, text };
  }
  return { aktion: aktion as Aktion, refnr };
}

// Speichern: greift nur, wenn die refnr existiert (rowCount 0 = unbekannt).
async function speichern(refnr: string, text: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stellen
        SET erkundung_vorschlag = $2,
            erkundung_vorschlag_am = now()
      WHERE refnr = $1`,
    [refnr, text.trim()]
  );
  return rowCount ?? 0;
}

// Übernehmen: Vorschlag → beschreibung (überschreibt bewusst eine vorhandene
// Beschreibung — die Bestätigung passiert im UI mit ALT-vs-NEU). Danach Vorschlag weg.
async function uebernehmen(refnr: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stellen
        SET beschreibung = erkundung_vorschlag,
            erkundung_vorschlag = NULL,
            erkundung_vorschlag_am = NULL
      WHERE refnr = $1
        AND erkundung_vorschlag IS NOT NULL`,
    [refnr]
  );
  return rowCount ?? 0;
}

async function verwerfen(refnr: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stellen
        SET erkundung_vorschlag = NULL,
            erkundung_vorschlag_am = NULL
      WHERE refnr = $1
        AND erkundung_vorschlag IS NOT NULL`,
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
    let betroffen: number;
    if (body.aktion === "speichern") betroffen = await speichern(body.refnr, body.text!);
    else if (body.aktion === "uebernehmen") betroffen = await uebernehmen(body.refnr);
    else betroffen = await verwerfen(body.refnr);

    if (betroffen === 0) {
      const grund =
        body.aktion === "speichern"
          ? "Stelle nicht gefunden"
          : "Kein offener Vorschlag für diese Stelle";
      return NextResponse.json({ ok: false, grund }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erkundung-Vorschlag-UPDATE fehlgeschlagen:", (err as Error).name);
    return NextResponse.json({ ok: false, grund: "Datenbankfehler" }, { status: 500 });
  }
}
