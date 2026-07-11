import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";

// Status einer Stelle manuell setzen:
//   "beworben" → versendet   ·   "tot" → aussortiert   ·   "verwerfen" → aussortiert
// "verwerfen" (Versandfertig-Queue) und "tot" (Detailseite) landen beide auf
// aussortiert — getrennte Schlüssel nur der Klarheit am Aufrufer halber; der
// Schritt ist umkehrbar (Status lässt sich wieder setzen).
// Direkter, parametrisierter UPDATE (Muster wie /api/bewerbungsweg);
// chatbot_leser hat GRANT UPDATE(status). versendet_am ist NICHT schreibbar
// (kein Grant) und bleibt daher unberührt.
const ERLAUBT: Record<string, string> = {
  beworben: "versendet",
  tot: "aussortiert",
  verwerfen: "aussortiert",
};

function istRefnr(wert: unknown): wert is string {
  return typeof wert === "string" && wert.length > 0 && wert.length <= 100;
}

export async function POST(request: Request) {
  if (istDemoModus()) return demoAntwort();
  const body: unknown = await request.json().catch(() => null);
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (!istRefnr(b.refnr)) {
    return NextResponse.json({ ok: false, grund: "Ungültige Anfrage" }, { status: 400 });
  }
  const status = typeof b.ziel === "string" ? ERLAUBT[b.ziel] : undefined;
  if (!status) {
    return NextResponse.json({ ok: false, grund: "Unbekanntes Ziel" }, { status: 400 });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE stellen SET status = $1 WHERE refnr = $2`,
      [status, b.refnr]
    );
    if (!rowCount) {
      return NextResponse.json({ ok: false, grund: "Stelle nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("Status-UPDATE fehlgeschlagen:", (err as Error).name);
    return NextResponse.json({ ok: false, grund: "Datenbankfehler" }, { status: 500 });
  }
}
