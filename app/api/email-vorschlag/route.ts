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

// Beide Statements tragen ihre Validierung im WHERE: greifen nur, wenn die
// refnr existiert UND ein offener Scout-Fund vorliegt. rowCount === 0 heißt
// also "nichts zu tun" (schon übernommen/verworfen oder unbekannte refnr).
async function uebernehmen(refnr: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stellen
        SET bewerbung_email = scout_fund_email,
            bewerbungskanal = 'email',
            scout_fund_email = NULL
      WHERE refnr = $1
        AND scout_fund_email IS NOT NULL
        AND bewerbung_email IS NULL`,
    [refnr]
  );
  return rowCount ?? 0;
}

async function verwerfen(refnr: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE stellen
        SET scout_fund_email = NULL,
            scout_fund_quelle = NULL
      WHERE refnr = $1
        AND scout_fund_email IS NOT NULL`,
    [refnr]
  );
  return rowCount ?? 0;
}

export async function POST(request: Request) {
  if (istDemoModus()) return demoAntwort();
  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { ok: false, grund: "Ungültige Anfrage" },
      { status: 400 }
    );
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
    console.error("E-Mail-Vorschlag-UPDATE fehlgeschlagen:", (err as Error).name);
    return NextResponse.json(
      { ok: false, grund: "Datenbankfehler" },
      { status: 500 }
    );
  }
}
