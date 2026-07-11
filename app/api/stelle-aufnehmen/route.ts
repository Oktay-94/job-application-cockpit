import { NextResponse } from "next/server";
import { demoAntwort, istDemoModus } from "@/lib/demo";
import pool from "@/lib/db";
import { rufeBuendelWebhook } from "@/lib/buendel";

// Manual job intake: a fund from the /firma-scannen shortcut gets a few-click
// entry into `stellen` so the existing pipeline (Baustein 5 scoring -> letter)
// picks it up. quelle='manuell', status='neu' -> scored on the next
// Nachschub-Motor run (no immediate API cost). Sending stays out of scope.

const KANAELE = ["email", "formular", "portal", "unklar"] as const;
type Kanal = (typeof KANAELE)[number];

interface AufnahmeBody {
  arbeitgeber: string;
  titel: string;
  beschreibung: string;
  kanal: Kanal;
  kontakt: string | null; // email / formular_url / externe_url, depending on kanal
  ort: string | null;
  homeoffice: boolean;
  force: boolean; // override the "already exists" guard
  buendeln: boolean; // fire the full bundle (score -> Opus letter -> CV) after insert
}

const istEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const istUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);

function feld(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}

function parseBody(body: unknown): AufnahmeBody | { fehler: string } {
  if (typeof body !== "object" || body === null) return { fehler: "Ungültige Anfrage" };
  const b = body as Record<string, unknown>;

  const arbeitgeber = feld(b.arbeitgeber, 200);
  if (!arbeitgeber) return { fehler: "Arbeitgeber fehlt oder ist zu lang" };
  const titel = feld(b.titel, 300);
  if (!titel) return { fehler: "Titel fehlt oder ist zu lang" };
  const beschreibung = feld(b.beschreibung, 20000);
  if (!beschreibung) return { fehler: "Beschreibung fehlt oder ist zu lang" };
  if (beschreibung.length < 30) {
    return { fehler: "Beschreibung zu kurz — bitte den Stellentext einfügen (Scoring braucht ihn)" };
  }

  const kanal = b.kanal as Kanal;
  if (!KANAELE.includes(kanal)) return { fehler: "Ungültiger Bewerbungsweg" };

  let kontakt: string | null = null;
  if (kanal === "email") {
    kontakt = feld(b.kontakt, 200);
    if (!kontakt || !istEmail(kontakt)) return { fehler: "Bitte eine gültige Bewerbungs-E-Mail angeben" };
  } else if (kanal === "formular" || kanal === "portal") {
    // URL ist optional — der Aufnahme-Dialog erfasst für Formular/Portal kein
    // Kontaktfeld; gesetzt wird dann nur der Kanal. Wenn doch eine URL kommt,
    // muss sie gültig sein.
    kontakt = feld(b.kontakt, 1000);
    if (kontakt && !istUrl(kontakt)) return { fehler: "Bitte eine gültige URL (http/https) angeben" };
  }

  const ort = feld(b.ort, 200); // optional -> null if empty
  const homeoffice = b.homeoffice === true;
  const force = b.force === true;
  const buendeln = b.buendeln === true;

  return { arbeitgeber, titel, beschreibung, kanal, kontakt, ort, homeoffice, force, buendeln };
}

// manuell-YYYYMMDD-HHMMSS (server runs in Europe/Berlin); unique enough for
// human-paced manual entry, a same-second collision is caught below.
function macheRefnr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `manuell-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Mirrors the motors' Titel-Dedup (lower(arbeitgeber)+lower(titel)), ignoring
// already-discarded rows. A hit means "probably a duplicate" -> warn unless force.
async function findeDuplikat(arbeitgeber: string, titel: string): Promise<string | null> {
  const { rows } = await pool.query<{ refnr: string }>(
    `SELECT refnr FROM stellen
      WHERE lower(arbeitgeber) = lower($1) AND lower(titel) = lower($2)
        AND status NOT IN ('aussortiert', 'fehler')
      LIMIT 1`,
    [arbeitgeber, titel]
  );
  return rows[0]?.refnr ?? null;
}

export async function POST(request: Request) {
  if (istDemoModus()) return demoAntwort();
  const parsed = parseBody(await request.json().catch(() => null));
  if ("fehler" in parsed) {
    return NextResponse.json({ ok: false, grund: parsed.fehler }, { status: 400 });
  }

  const kanalWert = parsed.kanal === "unklar" ? null : parsed.kanal;
  const bewerbungEmail = parsed.kanal === "email" ? parsed.kontakt : null;
  const formularUrl = parsed.kanal === "formular" ? parsed.kontakt : null;
  const externeUrl = parsed.kanal === "portal" ? parsed.kontakt : null;

  try {
    if (!parsed.force) {
      const dup = await findeDuplikat(parsed.arbeitgeber, parsed.titel);
      if (dup) {
        return NextResponse.json(
          { ok: false, grund: "Stelle existiert offenbar schon", duplikat: dup, kannForcen: true },
          { status: 409 }
        );
      }
    }

    const refnr = macheRefnr();
    await pool.query(
      `INSERT INTO stellen
         (refnr, titel, arbeitgeber, beschreibung, quelle, status,
          bewerbungskanal, bewerbung_email, formular_url, externe_url, ort, homeoffice)
       VALUES ($1, $2, $3, $4, 'manuell', 'neu', $5, $6, $7, $8, $9, $10)`,
      [refnr, parsed.titel, parsed.arbeitgeber, parsed.beschreibung, kanalWert,
       bewerbungEmail, formularUrl, externeUrl, parsed.ort, parsed.homeoffice]
    );

    // Insert succeeded -> optionally fire the full bundle. The webhook responds
    // fast (before Opus runs), so this does not block on letter generation.
    // A bundle failure must NOT fail the intake: the row is already saved.
    if (parsed.buendeln) {
      const buendel = await rufeBuendelWebhook(refnr);
      return NextResponse.json({ ok: true, refnr, buendel });
    }

    return NextResponse.json({ ok: true, refnr });
  } catch (err) {
    // 23505 = unique_violation on refnr (same-second collision) -> retryable
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { ok: false, grund: "Kurz nochmal versuchen (Zeitstempel-Kollision)" },
        { status: 409 }
      );
    }
    console.error("Stelle-aufnehmen-INSERT fehlgeschlagen:", (err as Error).name);
    return NextResponse.json({ ok: false, grund: "Datenbankfehler" }, { status: 500 });
  }
}
