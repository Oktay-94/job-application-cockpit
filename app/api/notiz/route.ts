import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";

// Eigene Notiz zu einer Stelle speichern. Direkter, parametrisierter UPDATE
// (Muster wie /api/bewerbungsweg); chatbot_leser hat GRANT UPDATE(notiz).
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
  if (typeof b.notiz !== "string" || b.notiz.length > 10000) {
    return NextResponse.json({ ok: false, grund: "Notiz fehlt oder ist zu lang" }, { status: 400 });
  }
  // Leerer Text → NULL (Notiz entfernt).
  const wert = b.notiz.trim().length === 0 ? null : b.notiz;

  try {
    const { rowCount } = await pool.query(
      `UPDATE stellen SET notiz = $1 WHERE refnr = $2`,
      [wert, b.refnr]
    );
    if (!rowCount) {
      return NextResponse.json({ ok: false, grund: "Stelle nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notiz-UPDATE fehlgeschlagen:", (err as Error).name);
    return NextResponse.json({ ok: false, grund: "Datenbankfehler" }, { status: 500 });
  }
}
