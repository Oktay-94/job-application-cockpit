import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import pool from "@/lib/db";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1500;
const MAX_TOOL_RUNDEN = 5;
const MAX_ZEILEN = 50;
const MAX_NACHRICHTEN = 40;
const MAX_NACHRICHT_LAENGE = 4000;

const SYSTEM_PROMPT = `Du bist der Lese-Agent des Bewerbungs-Cockpits. Du beantwortest Fragen zur Bewerbungspipeline, indem du die Postgres-Tabelle "stellen" abfragst. Antworte auf Deutsch, kurz und präzise.

Kernregeln:
1. Verlasse dich NIE auf Vorwissen oder frühere Antworten — frage IMMER zuerst die Datenbank ab. Behaupte nie, etwas existiere nicht, ohne nachgesehen zu haben.
2. Suche unscharf: Texte mit ILIKE und %-Platzhaltern vergleichen (z. B. arbeitgeber ILIKE '%bosch%').
3. Wenn du die möglichen Werte einer Spalte nicht kennst, frage zuerst mit SELECT DISTINCT nach.
4. Formatiere Datums-/Zeitwerte mit TO_CHAR(..., 'DD.MM.YYYY') bzw. 'DD.MM.YYYY HH24:MI'.
5. Du darfst nur lesen (SELECT/WITH). Keine Änderungen, keine anderen Tabellen.
6. Antworte als einfacher Text ohne Markdown: keine Tabellen, keine Sternchen, keine Überschriften. Nutze Zeilenumbrüche und Aufzählungen mit "-".

Schema der Tabelle stellen:
- refnr (text, Primärschlüssel-artig), titel (text), beruf (text), arbeitgeber (text), ort (text), plz (text)
- entfernung (integer, km), homeoffice (boolean), veroeffentlicht (date), eintrittsdatum (date)
- externe_url (text), quelle (text: 'bundesagentur' oder 'adzuna'), status (text)
- score (integer), score_text (text, Begründung der Bewertung), score_richtung (text)
- bewerbung_email (text, NULL = Bewerbung nur über Portal)
- erstellt_am (timestamp ohne Zeitzone, lokale Zeit), bewertet_am (timestamptz), versendet_am (timestamptz)
- beschreibung (text, Stellenbeschreibung), anschreiben (text, generiertes Anschreiben)

Achtung: beschreibung und anschreiben sind sehr lang — nimm sie nur in ein SELECT auf, wenn explizit danach gefragt wird.

Status-Pipeline (Reihenfolge):
neu → aussortiert / bewertet / fehler → nachbewertet → shortlist → anschreiben_erstellt / anschreiben_manuell → versendet`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "stellen_abfragen",
    description:
      "Führt eine SELECT-Abfrage auf der Postgres-Tabelle 'stellen' aus und gibt die Ergebniszeilen als JSON zurück (maximal 50 Zeilen). Nur lesende Abfragen (SELECT oder WITH), nur ein Statement.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Die SQL-SELECT-Abfrage, z. B. SELECT count(*) FROM stellen WHERE status = 'versendet'",
        },
      },
      required: ["query"],
    },
  },
];

interface ChatNachricht {
  role: "user" | "assistant";
  content: string;
}

function parseMessages(body: unknown): ChatNachricht[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) return null;
  if (messages.length > MAX_NACHRICHTEN) return null;

  const geprueft: ChatNachricht[] = [];
  for (const m of messages) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return null;
    if (
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.length > MAX_NACHRICHT_LAENGE
    ) {
      return null;
    }
    geprueft.push({ role, content });
  }
  if (geprueft[0].role !== "user") return null;
  return geprueft;
}

// Defense in depth on top of the read-only DB user: only a single
// SELECT/WITH statement is allowed through.
function pruefeQuery(roh: string): { ok: true; query: string } | { ok: false; fehler: string } {
  const query = roh.trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(query)) {
    return { ok: false, fehler: "Nur SELECT- oder WITH-Abfragen sind erlaubt." };
  }
  if (query.includes(";")) {
    return { ok: false, fehler: "Mehrere Statements sind nicht erlaubt (Semikolon gefunden)." };
  }
  return { ok: true, query };
}

async function fuehreQueryAus(roh: string): Promise<{ inhalt: string; istFehler: boolean }> {
  const geprueft = pruefeQuery(roh);
  if (!geprueft.ok) return { inhalt: geprueft.fehler, istFehler: true };

  try {
    const { rows } = await pool.query(geprueft.query);
    const gekappt = rows.slice(0, MAX_ZEILEN);
    const hinweis =
      rows.length > MAX_ZEILEN
        ? ` (auf ${MAX_ZEILEN} von ${rows.length} Zeilen gekappt)`
        : "";
    return {
      inhalt: `${JSON.stringify(gekappt)}${hinweis}`,
      istFehler: false,
    };
  } catch (err) {
    // Postgres error messages are safe to relay (no credentials), and the
    // model needs them to correct its query
    const meldung = err instanceof Error ? err.message : "Unbekannter Datenbankfehler";
    return { inhalt: `SQL-Fehler: ${meldung}`, istFehler: true };
  }
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY nicht konfiguriert");
    return NextResponse.json({ error: "Agent nicht konfiguriert" }, { status: 500 });
  }

  const chat = parseMessages(await request.json().catch(() => null));
  if (!chat) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = chat.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let runde = 0; runde <= MAX_TOOL_RUNDEN; runde++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({
          antwort: text || "(keine Antwort)",
        });
      }

      if (runde === MAX_TOOL_RUNDEN) {
        return NextResponse.json({
          antwort:
            "Abbruch: Die Anfrage hat zu viele Datenbank-Abfragen benötigt. Bitte stelle die Frage konkreter.",
        });
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const query =
          block.name === "stellen_abfragen" &&
          typeof (block.input as { query?: unknown }).query === "string"
            ? (block.input as { query: string }).query
            : null;
        const ergebnis = query
          ? await fuehreQueryAus(query)
          : { inhalt: "Ungültiger Tool-Aufruf: Parameter 'query' fehlt.", istFehler: true };
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: ergebnis.inhalt,
          is_error: ergebnis.istFehler,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    // Unreachable — the loop always returns — but TypeScript needs it
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  } catch (err) {
    // Never leak stack traces or the API key; log only the error class
    const name = err instanceof Error ? err.name : "UnknownError";
    console.error("Agent-Anfrage fehlgeschlagen:", name);
    const meldung =
      err instanceof Anthropic.APIError
        ? "Anthropic-API nicht erreichbar oder Anfrage abgelehnt"
        : "Interner Fehler";
    return NextResponse.json({ error: meldung }, { status: 500 });
  }
}
