import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";

interface RestampBody {
  refnr: string;
}

function parseBody(body: unknown): RestampBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { refnr } = body as Record<string, unknown>;
  if (typeof refnr !== "string" || refnr.length === 0 || refnr.length > 100) {
    return null;
  }
  return { refnr };
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

  const url = process.env.N8N_RESTAMP_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.error("N8N_RESTAMP_WEBHOOK_URL/N8N_WEBHOOK_SECRET nicht konfiguriert");
    return NextResponse.json(
      { ok: false, grund: "Webhook nicht konfiguriert" },
      { status: 500 }
    );
  }

  try {
    // 30 s statt 15 s: der Workflow rendert das PDF per Headless Chrome neu —
    // typisch ~3-5 s, im Worst Case pollt render.py deutlich länger.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cockpit-Secret": secret,
      },
      body: JSON.stringify({ refnr: body.refnr }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const antwort: unknown = await res.json().catch(() => null);

    // Antwort muss ein ok:boolean tragen ({ok:true, datum} bzw. {ok:false, grund}).
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
    console.error("n8n-Restamp-Webhook fehlgeschlagen:", timeout ? "Timeout" : "Netzwerkfehler");
    return NextResponse.json(
      {
        ok: false,
        grund: timeout
          ? "Workflow antwortet nicht (Timeout nach 30 s)"
          : "Workflow nicht erreichbar",
      },
      { status: 502 }
    );
  }
}
