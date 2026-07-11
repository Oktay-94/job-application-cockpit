// Pure, DB-freie Helfer/Typen/Konstanten rund um die Stellen-Filterung.
// Bewusst ohne Import von lib/db (pg), damit dieses Modul auch in Client-
// Komponenten gebündelt werden kann.

// Scout-Schwelle: ab diesem Score lohnt sich eine Erkundung des Bewerbungskanals.
// Geteilt zwischen Dashboard-Zähler (SQL) und Stellen-Liste (Deep-Link-Filter),
// damit Karte und Zielliste dieselbe Teilmenge zeigen.
export const SCOUT_SCHWELLE = 72;

export type Bewerbungskanal = "email" | "formular" | "portal" | "tot";

const BEWERBUNGSKAENAELE: readonly string[] = ["email", "formular", "portal", "tot"];

// Unknown values from the DB are treated like NULL (= channel not yet clarified)
export function parseKanal(wert: string | null): Bewerbungskanal | null {
  return wert && BEWERBUNGSKAENAELE.includes(wert) ? (wert as Bewerbungskanal) : null;
}

// Feste Gebietsliste aus der Scoring-Klassifikation (Baustein 5).
// NULL/Unbekanntes aus der DB zählt als "Sonstiges".
export const ARBEITSGEBIETE = [
  "Anwendungsentwicklung",
  "Systemintegration",
  "Cloud/DevOps",
  "IT-Support",
  "Sonstiges",
] as const;

export type Arbeitsgebiet = (typeof ARBEITSGEBIETE)[number];

export function parseArbeitsgebiet(wert: string | null): Arbeitsgebiet {
  return (ARBEITSGEBIETE as readonly string[]).includes(wert ?? "")
    ? (wert as Arbeitsgebiet)
    : "Sonstiges";
}

// URL-Slug ↔ Gebiet (für Deep-Links aus dem Dashboard) und Anzeige-Label
// ("Cloud/DevOps" wird wie im Mockup als "Cloud · DevOps" gezeigt).
export const ARBEITSGEBIET_SLUG: Record<Arbeitsgebiet, string> = {
  Anwendungsentwicklung: "anwendungsentwicklung",
  Systemintegration: "systemintegration",
  "Cloud/DevOps": "cloud",
  "IT-Support": "it-support",
  Sonstiges: "sonstiges",
};

export const ARBEITSGEBIET_LABEL: Record<Arbeitsgebiet, string> = {
  Anwendungsentwicklung: "Anwendungsentwicklung",
  Systemintegration: "Systemintegration",
  "Cloud/DevOps": "Cloud · DevOps",
  "IT-Support": "IT-Support",
  Sonstiges: "Sonstiges",
};

// Fertige, bereits eingefärbte SVGs in public/arbeitsgebiete/ (nicht umfärben).
export const ARBEITSGEBIET_ICON: Record<Arbeitsgebiet, string> = {
  Anwendungsentwicklung: "/arbeitsgebiete/anwendungsentwicklung.svg",
  Systemintegration: "/arbeitsgebiete/systemintegration.svg",
  "Cloud/DevOps": "/arbeitsgebiete/cloud-devops.svg",
  "IT-Support": "/arbeitsgebiete/it-support.svg",
  Sonstiges: "/arbeitsgebiete/sonstiges.svg",
};

export interface StellenListeZeile {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  ort: string | null;
  homeoffice: boolean | null;
  quelle: string | null;
  status: string | null;
  score: number | null;
  score_richtung: string | null;
  bewerbungskanal: string | null;
  ist_vermittler: boolean | null;
  arbeitsgebiet: string | null;
  ist_neu: boolean;
  // Berlin-Kalendertag (YYYY-MM-DD) von erstellt_am — exakt dieselbe
  // Tagesdefinition wie der Nachschub-Chart (getNachschubProQuelle).
  eingetroffen: string | null;
}

// Status-Segmente der Stellen-Liste (Mockup v3). aussortiert/fehler tauchen
// in der Liste nicht auf (siehe getStellenListe), darum kein eigenes Segment.
export type StatusSegment =
  | "alle"
  | "versandfertig"
  | "bewertung"
  | "versendet"
  | "manuell";

export function statusSegment(status: string | null): StatusSegment | null {
  switch (status) {
    case "anschreiben_erstellt":
      return "versandfertig";
    case "neu":
    case "bewertet":
    case "nachbewertet":
    case "shortlist":
      return "bewertung";
    case "versendet":
      return "versendet";
    case "anschreiben_manuell":
      return "manuell";
    default:
      return null;
  }
}

// Status-Gruppen der Stellen-Tabelle (Mockup-Facette): Neu · Bewertet ·
// Versandfertig · Beworben. Gleiche Zuordnung wie das Übersicht-Pipeline-Band
// (anschreiben_manuell zählt zu "bewertet", unzustellbar zu "beworben").
export type StellenStatus = "neu" | "bewertet" | "versandfertig" | "beworben";

export function stellenStatusGruppe(status: string | null): StellenStatus | null {
  switch (status) {
    case "neu":
      return "neu";
    case "bewertet":
    case "nachbewertet":
    case "shortlist":
    case "anschreiben_manuell":
      return "bewertet";
    case "anschreiben_erstellt":
      return "versandfertig";
    case "versendet":
    case "unzustellbar":
      return "beworben";
    default:
      return null;
  }
}

// Kanal-Filter-Slug: NULL/Unbekanntes = "ungeklaert" (Mockup-Logik).
export type KanalFilter =
  | "alle"
  | "email"
  | "portal"
  | "formular"
  | "ungeklaert"
  | "tot";

export function kanalFilterWert(bewerbungskanal: string | null): KanalFilter {
  return parseKanal(bewerbungskanal) ?? "ungeklaert";
}

// Bewerbungsweg-Facette der Tabelle: Portal + Formular werden zu "webform"
// zusammengefasst, NULL/Unbekanntes = "ungeklaert". Basiert auf derselben
// Spalte (bewerbungskanal), die die Detailseite pro Stelle anzeigt.
export type KanalGruppe = "email" | "webform" | "ungeklaert" | "tot";

export function kanalGruppe(bewerbungskanal: string | null): KanalGruppe {
  if (bewerbungskanal === "email") return "email";
  if (bewerbungskanal === "portal" || bewerbungskanal === "formular") return "webform";
  if (bewerbungskanal === "tot") return "tot";
  return "ungeklaert";
}

// Bewerbungsweg pro Stelle (genaue Werte) + eine app-weite Farb-/Label-Quelle,
// damit Stellen-Tabelle und Versandfertig identisch einfärben.
export type Bewerbungsweg = "email" | "portal" | "formular" | "ungeklaert" | "tot";

export function bewerbungsweg(bewerbungskanal: string | null): Bewerbungsweg {
  if (bewerbungskanal === "email") return "email";
  if (bewerbungskanal === "portal") return "portal";
  if (bewerbungskanal === "formular") return "formular";
  if (bewerbungskanal === "tot") return "tot";
  return "ungeklaert";
}

export const WEG_FARBE: Record<Bewerbungsweg, string> = {
  email: "#1d9d52", // grün
  portal: "#0a6cd4", // blau
  formular: "#0f8f8a", // teal
  ungeklaert: "#e3811b", // amber
  tot: "#64748b", // grau
};

export const WEG_LABEL: Record<Bewerbungsweg, string> = {
  email: "E-Mail",
  portal: "Portal",
  formular: "Formular",
  ungeklaert: "Ungeklärt",
  tot: "Tot",
};

export function cvVariante(scoreRichtung: string | null): "A" | "B" {
  return scoreRichtung === "entwicklung" ? "A" : "B";
}

export function quelleLabel(quelle: string | null): string {
  if (quelle === "bundesagentur") return "BA";
  if (quelle === "adzuna") return "Adzuna";
  return quelle ?? "?";
}
