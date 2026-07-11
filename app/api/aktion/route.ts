import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";

const AKTIONEN = ["senden", "erledigt", "erzeugen"] as const;
type Aktion = (typeof AKTIONEN)[number];

interface AktionBody {
  aktion: Aktion;
  refnr: string;
}

function parseBody(body: unknown): AktionBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { aktion, refnr } = body as Record<string, unknown>;
  if (!AKTIONEN.includes(aktion as Aktion)) return null;
  if (typeof refnr !== "string" || refnr.length === 0 || refnr.length > 100) {
    return null;
  }
  return { aktion: aktion as Aktion, refnr };
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

  // Zweiter Riegel: "senden" verschickt IMMER eine E-Mail. Für Portal/Formular
  // (oder fehlende Stelle) hier serverseitig ablehnen — der Mailversand darf nie
  // blind feuern, auch wenn ein Aufrufer die UI-Verzweigung umgeht.
  if (body.aktion === "senden") {
    const { rows } = await pool.query<{ bewerbungskanal: string | null }>(
      `SELECT bewerbungskanal FROM stellen WHERE refnr = $1`,
      [body.refnr]
    );
    const kanal = rows[0]?.bewerbungskanal ?? null;
    if (kanal !== "email") {
      return NextResponse.json(
        {
          ok: false,
          grund:
            "Senden ist nur für den E-Mail-Kanal — Portal/Formular über die jeweilige Aktion erledigen.",
        },
        { status: 409 }
      );
    }
  }

  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.error("N8N_WEBHOOK_URL/N8N_WEBHOOK_SECRET nicht konfiguriert");
    return NextResponse.json(
      { ok: false, grund: "Webhook nicht konfiguriert" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cockpit-Secret": secret,
      },
      body: JSON.stringify({ aktion: body.aktion, refnr: body.refnr }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const antwort: unknown = await res.json().catch(() => null);

    // "erzeugen" ist im n8n-Zweig rein statuscode-basiert (202 = gestartet,
    // 409 = läuft bereits). Der Body ist nur eine Nachricht — ein ok:boolean
    // ist NICHT garantiert. Darum hier tolerant: Statuscode durchreichen, Body
    // bestmöglich mitgeben, aber kein 502 erzwingen, wenn ok fehlt.
    if (body.aktion === "erzeugen") {
      const koerper =
        typeof antwort === "object" && antwort !== null ? (antwort as object) : {};
      return NextResponse.json(koerper, { status: res.status });
    }

    // SENDEN/erledigt bleiben strikt: Antwort muss ein ok:boolean tragen.
    if (
      typeof antwort !== "object" ||
      antwort === null ||
      typeof (antwort as { ok?: unknown }).ok !== "boolean"
    ) {
      return NextResponse.json(
        { ok: false, grund: `Unerwartete Antwort vom Workflow (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    return NextResponse.json(antwort, { status: res.status });
  } catch (err) {
    // Only the error name — never the full error, it may contain the URL
    const timeout = err instanceof Error && err.name === "TimeoutError";
    console.error("n8n-Webhook fehlgeschlagen:", timeout ? "Timeout" : "Netzwerkfehler");
    return NextResponse.json(
      {
        ok: false,
        grund: timeout
          ? "Workflow antwortet nicht (Timeout nach 15 s)"
          : "Workflow nicht erreichbar",
      },
      { status: 502 }
    );
  }
}
