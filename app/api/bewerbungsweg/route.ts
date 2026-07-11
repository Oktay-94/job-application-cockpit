import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";

// Erkundungs-Ausgänge: ein gefundener Bewerbungskanal wird festgeschrieben.
// Alle vier Varianten setzen bewerbungskanal; email/formular tragen zusätzlich
// die Adresse/URL nach. Jedes UPDATE läuft parametrisiert.
type Eingabe =
  | { kanal: "email"; refnr: string; email: string }
  | { kanal: "formular"; refnr: string; url: string }
  | { kanal: "portal"; refnr: string }
  | { kanal: "tot"; refnr: string };

function istRefnr(wert: unknown): wert is string {
  return typeof wert === "string" && wert.length > 0 && wert.length <= 100;
}

// Minimal-Plausibilität: ein "@" und danach irgendwo ein Punkt (mit Zeichen
// davor und danach), keine Leerzeichen. Keine vollständige RFC-Prüfung.
function istEmail(wert: unknown): wert is string {
  return typeof wert === "string" && /^\S+@\S+\.\S+$/.test(wert);
}

function parseBody(body: unknown): Eingabe | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (!istRefnr(b.refnr)) return null;

  switch (b.kanal) {
    case "email":
      return istEmail(b.email)
        ? { kanal: "email", refnr: b.refnr, email: b.email }
        : null;
    case "formular":
      return typeof b.url === "string" && b.url.length > 0 && b.url.length <= 2000
        ? { kanal: "formular", refnr: b.refnr, url: b.url }
        : null;
    case "portal":
      return { kanal: "portal", refnr: b.refnr };
    case "tot":
      return { kanal: "tot", refnr: b.refnr };
    default:
      return null;
  }
}

async function schreibeKanal(eingabe: Eingabe): Promise<number> {
  switch (eingabe.kanal) {
    case "email": {
      const { rowCount } = await pool.query(
        `UPDATE stellen SET bewerbung_email = $1, bewerbungskanal = 'email' WHERE refnr = $2`,
        [eingabe.email, eingabe.refnr]
      );
      return rowCount ?? 0;
    }
    case "formular": {
      const { rowCount } = await pool.query(
        `UPDATE stellen SET bewerbungskanal = 'formular', formular_url = $1 WHERE refnr = $2`,
        [eingabe.url, eingabe.refnr]
      );
      return rowCount ?? 0;
    }
    case "portal": {
      const { rowCount } = await pool.query(
        `UPDATE stellen SET bewerbungskanal = 'portal' WHERE refnr = $1`,
        [eingabe.refnr]
      );
      return rowCount ?? 0;
    }
    case "tot": {
      const { rowCount } = await pool.query(
        `UPDATE stellen SET bewerbungskanal = 'tot' WHERE refnr = $1`,
        [eingabe.refnr]
      );
      return rowCount ?? 0;
    }
  }
}

// Nur im E-Mail-Fall: stößt den n8n-Workflow "Einzelstelle buendeln" an, der
// Anschreiben + Lebenslauf im Hintergrund erzeugt. Der Webhook antwortet sofort
// (Respond Immediately), deshalb genügt ein kurzer Timeout. Schlägt er fehl,
// bleibt der DB-Write trotzdem gültig — wir melden nur buendelung:false.
async function loeseBuendelungAus(refnr: string): Promise<boolean> {
  const url = process.env.N8N_BUENDELN_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.error("N8N_BUENDELN_WEBHOOK_URL/N8N_WEBHOOK_SECRET nicht konfiguriert");
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cockpit-Secret": secret,
      },
      body: JSON.stringify({ refnr }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    console.error("Buendelungs-Webhook fehlgeschlagen:", timeout ? "Timeout" : "Netzwerkfehler");
    return false;
  }
}

export async function POST(request: Request) {
  if (istDemoModus()) return demoAntwort();
  const eingabe = parseBody(await request.json().catch(() => null));
  if (!eingabe) {
    return NextResponse.json(
      { ok: false, grund: "Ungültige Anfrage" },
      { status: 400 }
    );
  }

  try {
    const betroffen = await schreibeKanal(eingabe);
    if (betroffen === 0) {
      return NextResponse.json(
        { ok: false, grund: "Stelle nicht gefunden" },
        { status: 404 }
      );
    }

    // Auto-Bündelung nur im E-Mail-Fall (Formular/Portal/tot lösen nichts aus)
    if (eingabe.kanal === "email") {
      const buendelung = await loeseBuendelungAus(eingabe.refnr);
      return NextResponse.json({ ok: true, buendelung });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Bewerbungsweg-UPDATE fehlgeschlagen:", (err as Error).name);
    return NextResponse.json(
      { ok: false, grund: "Datenbankfehler" },
      { status: 500 }
    );
  }
}
