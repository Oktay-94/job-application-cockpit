import pool from "@/lib/db";

export interface ProfilEintrag {
  schluessel: string;
  wert: string;
}

// Master data lives only in the DB (bewerber_profil) — never hardcoded,
// never sent to the client outside the generated order text.
export async function getBewerberProfil(): Promise<ProfilEintrag[]> {
  const { rows } = await pool.query<ProfilEintrag>(
    "SELECT schluessel, wert FROM bewerber_profil"
  );
  return rows;
}

// Display labels for known profile keys; unknown keys fall back to
// a generic "underscores to spaces, capitalized" formatting.
const PROFIL_LABELS: Record<string, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  email: "E-Mail",
  telefon: "Telefon",
  strasse: "Straße",
  plz: "PLZ",
  ort: "Ort",
  wohnort: "Wohnort",
  geburtsdatum: "Geburtsdatum (falls verlangt)",
  staatsangehoerigkeit: "Staatsangehörigkeit",
  verfuegbar_ab: "Verfügbar ab",
  arbeitszeit: "Arbeitszeit",
  reisebereitschaft: "Reisebereitschaft",
  umzugsbereitschaft: "Umzugsbereitschaft",
  fuehrerschein: "Führerschein",
  schulabschluss: "Schulabschluss",
  berufsabschluss: "Berufsabschluss",
  deutsch_niveau: "Deutsch-Niveau",
  englisch_niveau: "Englisch-Niveau",
  geschlecht: "Geschlecht",
  gehaltsvorstellung: "Gehaltsvorstellung",
};

// Template order from the Ausfüll-Auftrag spec; unknown keys go last
const PROFIL_REIHENFOLGE = Object.keys(PROFIL_LABELS);

export function profilLabel(schluessel: string): string {
  return (
    PROFIL_LABELS[schluessel] ??
    schluessel
      .replace(/_/g, " ")
      .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
  );
}

export function sortiereProfil(eintraege: ProfilEintrag[]): ProfilEintrag[] {
  return [...eintraege].sort((a, b) => {
    const ia = PROFIL_REIHENFOLGE.indexOf(a.schluessel);
    const ib = PROFIL_REIHENFOLGE.indexOf(b.schluessel);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.schluessel.localeCompare(b.schluessel, "de");
  });
}
