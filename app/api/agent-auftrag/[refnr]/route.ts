import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { findeOrdner } from "@/lib/dokumente";
import { getBewerberProfil, profilLabel, sortiereProfil } from "@/lib/profil";
import { cvVariante } from "@/lib/stellen";

interface AuftragsStelle {
  titel: string | null;
  arbeitgeber: string | null;
  formular_url: string | null;
  score_richtung: string | null;
}

function baueAuftragstext(
  stelle: AuftragsStelle,
  profilZeilen: string,
  variante: "A" | "B",
  ordnerpfad: string
): string {
  return `Ausfüll-Auftrag (NICHT absenden):

Ich möchte mich auf die Stelle "${stelle.titel ?? "?"}" bei ${stelle.arbeitgeber ?? "?"} bewerben.

Navigation:
Das Bewerbungsformular: ${stelle.formular_url}
Falls du auf einer Login-/Registrierungsseite landest, STOPPE sofort.

Fülle das Formular vollständig aus, aber SENDE ES NICHT AB.

Meine Angaben (NUR diese verwenden, nichts erfinden, nichts dazuerfinden):
${profilZeilen}

Datei-Uploads (Lebenslauf-Variante ${variante}):
Die Uploads übernehme ICH selbst. Klicke Upload-Buttons NICHT an — ein nativer
Datei-Dialog würde dich blockieren. Wenn alle anderen Felder ausgefüllt sind,
stoppe und sage mir, welches Upload-Feld welche Datei braucht.
Mein Dateiordner: ${ordnerpfad}
Danach machst du mit der Kontroll-Liste weiter.

Regeln:
1. Wenn ein Pflichtfeld eine Angabe verlangt, die oben nicht steht, STOPPE und
   frage mich — nichts raten.
2. Wenn eine vorgegebene Option nicht exakt existiert, wähle die nächstliegende
   und melde die Abweichung ausdrücklich.
3. Bei Login, Registrierung oder CAPTCHA sofort stoppen und an mich übergeben.
4. STOPPE ZWINGEND, BEVOR du den finalen Absende-Button klickst — auch nach den Uploads.
5. Gib mir zum Schluss eine Kontroll-Liste: jedes Feld mit eingetragenem Wert +
   Zustand der Upload-Felder.`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ refnr: string }> }
) {
  const { refnr } = await params;

  const { rows } = await pool.query<AuftragsStelle>(
    `SELECT titel, arbeitgeber, formular_url, score_richtung
     FROM stellen WHERE refnr = $1`,
    [refnr]
  );
  const stelle = rows[0];
  if (!stelle) {
    return NextResponse.json({ fehler: "Stelle nicht gefunden" }, { status: 404 });
  }
  if (!stelle.formular_url) {
    return NextResponse.json(
      { fehler: "Keine formular_url für diese Stelle hinterlegt" },
      { status: 409 }
    );
  }

  const ordner = await findeOrdner(refnr);
  if (!ordner) {
    return NextResponse.json(
      { fehler: "Bewerbungsordner nicht gefunden" },
      { status: 404 }
    );
  }

  const profil = await getBewerberProfil();
  if (profil.length === 0) {
    return NextResponse.json(
      { fehler: "bewerber_profil ist leer — Stammdaten fehlen" },
      { status: 500 }
    );
  }

  const profilZeilen = sortiereProfil(profil)
    .map((e) => `- ${profilLabel(e.schluessel)}: ${e.wert}`)
    .join("\n");

  const text = baueAuftragstext(
    stelle,
    profilZeilen,
    cvVariante(stelle.score_richtung),
    ordner
  );

  return NextResponse.json({ text });
}
