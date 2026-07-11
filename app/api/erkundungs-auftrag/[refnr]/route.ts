import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { bewerbungsUrl } from "@/lib/stellen";

interface ErkundungsStelle {
  titel: string | null;
  arbeitgeber: string | null;
  externe_url: string | null;
}

// Bewährtes Erkundungs-Rezept: Kanal herausfinden, aber NICHTS ausfüllen/absenden.
function baueErkundungstext(stelle: ErkundungsStelle, stellenLink: string): string {
  return `Das ist eine Stellenanzeige (${stelle.arbeitgeber ?? "?"}, ${stelle.titel ?? "?"}), auf die ich mich bewerben möchte. Erkundungsauftrag, NICHTS ausfüllen und NICHTS absenden:
1. Finde heraus, wie man sich auf diese Stelle bewirbt. Prüfe AUSDRÜCKLICH, ob eine Bewerbungs-E-Mail-Adresse sichtbar ist: mailto-Links hinter 'Jetzt bewerben', Kontaktangaben im Anzeigentext, verlinkte Firmen-PDFs, Karriereseite der Firma.
2. Wenn eine E-Mail existiert: Nenne sie EXAKT (Adresse + wo gefunden) und stoppe.
3. Wenn keine E-Mail existiert: Navigiere bis zum Bewerbungsformular bzw. bis zur Stelle, wo es ohne Konto/Login nicht weitergeht, und berichte: Welche Felder/Pflichtangaben? Welche PDF-Uploads? Braucht man ein Konto?
Stoppe bei Login, Registrierung oder CAPTCHA und übergib an mich.

Stellen-Link: ${stellenLink}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ refnr: string }> }
) {
  const { refnr } = await params;

  const { rows } = await pool.query<ErkundungsStelle>(
    `SELECT titel, arbeitgeber, externe_url FROM stellen WHERE refnr = $1`,
    [refnr]
  );
  const stelle = rows[0];
  if (!stelle) {
    return NextResponse.json({ fehler: "Stelle nicht gefunden" }, { status: 404 });
  }

  // externe_url mit BA-Jobdetail-Fallback (siehe bewerbungsUrl)
  const url = bewerbungsUrl({ externe_url: stelle.externe_url, refnr });
  const text = baueErkundungstext(stelle, url);

  return NextResponse.json({ text, url });
}
