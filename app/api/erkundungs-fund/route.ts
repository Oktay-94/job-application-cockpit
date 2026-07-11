import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";

// Schreibt eine bei der Erkundung gefundene Bewerbungs-E-Mail in den
// scout_fund_email-Slot (wie der n8n-E-Mail-Scout). Der Fund erscheint dadurch
// in den „E-Mail-Vorschlägen" und wird über /api/email-vorschlag übernommen
// (→ bewerbung_email) oder verworfen. So mündet der manuelle/Agent-Erkundungs-
// fund in denselben Bestätigungs-Flow wie die automatischen Scout-Funde.

interface Body {
  refnr: string;
  email: string;
  quelle?: string;
}

// Bewusst dieselbe lockere E-Mail-Plausibilität wie in /api/bewerbungsweg.
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MAX_QUELLE = 60;

function parseBody(body: unknown): Body | null {
  if (typeof body !== "object" || body === null) return null;
  const { refnr, email, quelle } = body as Record<string, unknown>;
  if (typeof refnr !== "string" || refnr.length === 0 || refnr.length > 100) return null;
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 200) return null;
  let q: string | undefined;
  if (quelle !== undefined) {
    if (typeof quelle !== "string" || quelle.length > MAX_QUELLE) return null;
    q = quelle.trim() || undefined;
  }
  return { refnr, email: email.trim(), quelle: q };
}

export async function POST(request: Request) {
  if (istDemoModus()) return demoAntwort();
  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ ok: false, grund: "Ungültige Anfrage" }, { status: 400 });
  }

  try {
    // Greift nur für eine existierende Stelle (rowCount 0 = unbekannte refnr).
    const { rowCount } = await pool.query(
      `UPDATE stellen
          SET scout_fund_email = $2,
              scout_fund_quelle = $3
        WHERE refnr = $1`,
      [body.refnr, body.email, body.quelle ?? "erkundung"]
    );

    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ ok: false, grund: "Stelle nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erkundungs-Fund-UPDATE fehlgeschlagen:", (err as Error).name);
    return NextResponse.json({ ok: false, grund: "Datenbankfehler" }, { status: 500 });
  }
}
