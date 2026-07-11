import pool from "@/lib/db";
import {
  ARBEITSGEBIETE,
  parseArbeitsgebiet,
  SCOUT_SCHWELLE,
  type Arbeitsgebiet,
  type StellenListeZeile,
} from "@/lib/stellen-filter";

// DB-freie Filter-Helfer leben in stellen-filter.ts (auch client-importierbar);
// hier re-exportiert, damit bestehende Server-Importe aus @/lib/stellen weiter
// funktionieren.
export {
  parseKanal,
  parseArbeitsgebiet,
  cvVariante,
  quelleLabel,
  statusSegment,
  kanalFilterWert,
  SCOUT_SCHWELLE,
  ARBEITSGEBIETE,
  ARBEITSGEBIET_SLUG,
  ARBEITSGEBIET_LABEL,
  ARBEITSGEBIET_ICON,
} from "@/lib/stellen-filter";
export type {
  Bewerbungskanal,
  Arbeitsgebiet,
  StellenListeZeile,
  StatusSegment,
  KanalFilter,
} from "@/lib/stellen-filter";

export interface StellenUebersicht {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  ort: string | null;
  quelle: string | null;
  status: string | null;
  score: number | null;
  score_richtung: string | null;
  bewerbungskanal: string | null;
  hat_email: boolean;
  ist_vermittler: boolean | null;
}

export interface StelleDetail {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  ort: string | null;
  plz: string | null;
  quelle: string | null;
  status: string | null;
  score: number | null;
  score_text: string | null;
  score_richtung: string | null;
  externe_url: string | null;
  bewerbung_email: string | null;
  bewerbungskanal: string | null;
  formular_url: string | null;
  anschreiben: string | null;
  versendet_am: Date | null;
  ist_vermittler: boolean | null;
  scout_geprueft_am: Date | null;
  scout_fund_email: string | null;
  // Detailseite (Schritt: Stelle-Detail)
  beschreibung: string | null;
  erkundung_vorschlag: string | null; // Beschreibungs-Vorschlag des Agenten vor Übernahme
  erkundung_vorschlag_am: Date | null;
  notiz: string | null;
  arbeitsgebiet: string | null;
  veroeffentlicht: string | null; // ISO-Datum (YYYY-MM-DD)
  erstellt_am: Date | null;
  bewertet_am: Date | null;
  rueckmeldung: string | null;
  rueckmeldung_am: Date | null;
  rueckmeldung_zusammenfassung: string | null;
  gespraech_am: Date | null;
  gespraech_ort: string | null;
}

export async function getStellenUebersicht(): Promise<StellenUebersicht[]> {
  const { rows } = await pool.query<StellenUebersicht>(
    `SELECT refnr, titel, arbeitgeber, ort, quelle, status, score, score_richtung,
            bewerbungskanal, bewerbung_email IS NOT NULL AS hat_email, ist_vermittler
     FROM stellen
     ORDER BY score DESC NULLS LAST, arbeitgeber ASC`
  );
  return rows;
}

// SQL-Ausdruck für den letzten 9-Uhr-Zeitpunkt (heute 09:00, wenn jetzt danach,
// sonst gestern 09:00). erstellt_am ist bereits naive Lokalzeit (Europe/Berlin).
const LETZTER_NEUN_UHR = `(
  CASE
    WHEN (now() AT TIME ZONE 'Europe/Berlin')::time >= time '09:00'
      THEN (now() AT TIME ZONE 'Europe/Berlin')::date + time '09:00'
    ELSE ((now() AT TIME ZONE 'Europe/Berlin')::date - 1) + time '09:00'
  END
)`;

// Status, die nicht in der Stellen-Liste / den aktionablen Dashboard-Zahlen auftauchen.
// 'abgelaufen' (vom Frische-Wächter gesetzt) gehört dazu: eine tote Anzeige ist
// keine aktive Bewerbungschance. Sie bleibt aber über die eigene Route
// /abgelaufen + die Dashboard-Karte sichtbar (siehe getAbgelaufeneStellen).
const LISTE_FILTER = `status NOT IN ('aussortiert', 'fehler', 'abgelaufen')`;

// Datenquelle für die Stellen-Liste (Kachel-Raster). Anders als
// getStellenUebersicht klammert sie aussortiert/fehler aus und liefert
// arbeitsgebiet + ist_neu (= erstellt_am seit dem letzten 9-Uhr-Zeitpunkt).
// friedhof=true blendet die aktive Liste aus und zeigt NUR die vom
// Frische-Wächter als tot markierten Stellen (status='abgelaufen') — derselbe
// Zeilen-Shape, damit die Stellen-Tabelle unverändert rendert (Status-Badge
// "Abgelaufen" existiert bereits). Das ist die gezielte Aufhebung des sonst
// geltenden LISTE_FILTER-Ausschlusses für den Job-Friedhof.
export async function getStellenListe(
  opts: { friedhof?: boolean } = {}
): Promise<StellenListeZeile[]> {
  const where = opts.friedhof ? `status = 'abgelaufen'` : LISTE_FILTER;
  const { rows } = await pool.query<StellenListeZeile>(
    `SELECT refnr, titel, arbeitgeber, ort, homeoffice, quelle, status, score, score_richtung,
            bewerbungskanal, ist_vermittler, arbeitsgebiet,
            COALESCE(erstellt_am >= ${LETZTER_NEUN_UHR}, false) AS ist_neu,
            erstellt_am::date::text AS eingetroffen
     FROM stellen
     WHERE ${where}
     ORDER BY score DESC NULLS LAST, arbeitgeber ASC`
  );
  return rows;
}

// Live-Anzahl abgelaufener Stellen — fürs Friedhof-Badge in der Filterleiste.
// Immer frisch aus der DB (die Zahl schwankt: tote Stellen kommen dazu,
// zurückgeholte fallen raus), nie hartkodiert.
export async function getAbgelaufeneAnzahl(): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM stellen WHERE status = 'abgelaufen'`
  );
  return Number(rows[0]?.n ?? 0);
}

export interface AbgelaufeneZeile {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  ort: string | null;
  quelle: string | null;
  score: number | null;
  abgelaufen_am: string | null; // ISO-Timestamp, server-seitig formatiert
}

// Datenquelle für die eigene Route /abgelaufen: vom Frische-Wächter als tot
// markierte Stellen. Bewusst getrennt von getStellenListe (die schließt
// 'abgelaufen' aus), damit tote Stellen sichtbar bleiben, ohne die aktive
// Pipeline/Liste zu verwässern. Neueste zuerst.
export async function getAbgelaufeneStellen(): Promise<AbgelaufeneZeile[]> {
  const { rows } = await pool.query<AbgelaufeneZeile>(
    `SELECT refnr, titel, arbeitgeber, ort, quelle, score,
            to_char(abgelaufen_am AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI') AS abgelaufen_am
     FROM stellen
     WHERE status = 'abgelaufen'
     ORDER BY abgelaufen_am DESC NULLS LAST, arbeitgeber ASC`
  );
  return rows;
}

export interface ArbeitsgebietAnzahl {
  gebiet: Arbeitsgebiet;
  anzahl: number;
}

export interface ScoreBucket {
  label: string;
  anzahl: number;
}

// 5-stufige Übersichts-Pipeline (Mockup). Jede aktive Stelle landet in genau
// einem Segment; die Summe ergibt aktivGesamt (= Sidebar-Badge "Stellen").
export interface PipelineStufen {
  neu: number;
  bewertet: number;
  versandfertig: number;
  beworben: number;
  rueckmeldung: number;
}

export interface DashboardDaten {
  gesamt: number; // count(*) inkl. aussortiert/fehler
  aktivGesamt: number; // status NOT IN (aussortiert, fehler, abgelaufen) – die "Pipeline"
  abgelaufenInPipeline: number; // status='abgelaufen' – getrennt von den Aktiv-Zahlen
  bewertet: number;
  versandfertig: number; // = anschreiben_erstellt (eine Quelle, app-weit)
  versendet: number;
  avgScore: number | null; // Ø Score der aktiven, bewerteten Stellen
  pipeline: PipelineStufen;
  // "Was steht an" – jede Zahl verlinkt in die gefilterte Stellen-Liste
  emailVersandfertig: number;
  portalVersandfertig: number;
  ungeklaert: number;
  heuteNeu: number;
  rueckmeldungen: number; // Firmen-Antworten (rueckmeldung gesetzt, ohne "irrelevant")
  arbeitsgebiete: ArbeitsgebietAnzahl[];
  scoreHistogramm: ScoreBucket[];
}

// Score-Histogramm-Kübel (untere Grenze inklusiv, obere exklusiv; 90 = 90+).
// 5 Kübel exakt wie im Übersicht-Mockup (<60 fasst die unteren zusammen).
const SCORE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "<60", min: 0, max: 60 },
  { label: "60–69", min: 60, max: 70 },
  { label: "70–79", min: 70, max: 80 },
  { label: "80–89", min: 80, max: 90 },
  { label: "90+", min: 90, max: 1000 },
];

// Alle Dashboard-Zahlen in einem Rutsch. Aktionable Zahlen (Was-steht-an,
// Verteilungen, Histogramm) beziehen sich auf die Listen-Population
// (ohne aussortiert/fehler); "gesamt"/"bewertet" zählen den ganzen Bestand.
export async function getDashboardDaten(): Promise<DashboardDaten> {
  const kennzahlen = pool.query<{
    gesamt: string;
    aktiv: string;
    abgelaufen: string;
    bewertet: string;
    versandfertig: string;
    versendet: string;
    unzustellbar: string;
    neu: string;
    avg_score: string | null;
    email_versandfertig: string;
    portal_versandfertig: string;
    ungeklaert: string;
    heute_neu: string;
    rueckmeldungen: string;
  }>(
    `SELECT
       count(*) AS gesamt,
       count(*) FILTER (WHERE ${LISTE_FILTER}) AS aktiv,
       count(*) FILTER (WHERE status = 'abgelaufen') AS abgelaufen,
       count(*) FILTER (WHERE score IS NOT NULL) AS bewertet,
       count(*) FILTER (WHERE status = 'anschreiben_erstellt') AS versandfertig,
       count(*) FILTER (WHERE status = 'versendet') AS versendet,
       count(*) FILTER (WHERE status = 'unzustellbar') AS unzustellbar,
       count(*) FILTER (WHERE status = 'neu') AS neu,
       round(avg(score) FILTER (WHERE ${LISTE_FILTER} AND score IS NOT NULL)) AS avg_score,
       count(*) FILTER (WHERE status = 'anschreiben_erstellt' AND bewerbungskanal = 'email') AS email_versandfertig,
       count(*) FILTER (WHERE status = 'anschreiben_erstellt' AND bewerbungskanal = 'portal') AS portal_versandfertig,
       count(*) FILTER (WHERE ${LISTE_FILTER} AND bewerbungskanal IS NULL AND score >= ${SCOUT_SCHWELLE}) AS ungeklaert,
       count(*) FILTER (WHERE ${LISTE_FILTER} AND erstellt_am >= ${LETZTER_NEUN_UHR}) AS heute_neu,
       count(*) FILTER (WHERE rueckmeldung IS NOT NULL AND rueckmeldung <> 'irrelevant') AS rueckmeldungen
     FROM stellen`
  );

  const gebiete = pool.query<{ gebiet: string | null; anzahl: string }>(
    `SELECT arbeitsgebiet AS gebiet, count(*) AS anzahl
     FROM stellen
     WHERE ${LISTE_FILTER}
     GROUP BY arbeitsgebiet`
  );

  const histogramm = pool.query<Record<string, string>>(
    `SELECT ${SCORE_BUCKETS.map(
      (b, i) =>
        `count(*) FILTER (WHERE score >= ${b.min} AND score < ${b.max}) AS b${i}`
    ).join(",\n            ")}
     FROM stellen
     WHERE ${LISTE_FILTER} AND score IS NOT NULL`
  );

  const [k, g, h] = await Promise.all([kennzahlen, gebiete, histogramm]);

  // NULL/Unbekanntes auf die feste Gebietsliste falten, in fester Reihenfolge.
  const gebietSumme = new Map<Arbeitsgebiet, number>(
    ARBEITSGEBIETE.map((name) => [name, 0])
  );
  for (const row of g.rows) {
    const gebiet = parseArbeitsgebiet(row.gebiet);
    gebietSumme.set(gebiet, (gebietSumme.get(gebiet) ?? 0) + Number(row.anzahl));
  }
  const arbeitsgebiete = ARBEITSGEBIETE.map((name) => ({
    gebiet: name,
    anzahl: gebietSumme.get(name) ?? 0,
  })).sort((a, b) => b.anzahl - a.anzahl);

  const hRow = h.rows[0] ?? {};
  const scoreHistogramm = SCORE_BUCKETS.map((b, i) => ({
    label: b.label,
    anzahl: Number(hRow[`b${i}`] ?? 0),
  }));

  const z = k.rows[0];
  const aktiv = Number(z.aktiv);
  const neu = Number(z.neu);
  const versandfertig = Number(z.versandfertig); // anschreiben_erstellt
  // Beworben = versendet + unzustellbar (beides ist raus); Rückmeldung hat noch
  // keine Datenquelle. "Bewertet" als Catch-all → die 5 Stufen summieren sich
  // garantiert auf aktivGesamt (auch bei künftigen Status-Werten).
  const beworben = Number(z.versendet) + Number(z.unzustellbar);
  const rueckmeldung = 0;
  const bewertetStufe = aktiv - neu - versandfertig - beworben - rueckmeldung;

  return {
    gesamt: Number(z.gesamt),
    aktivGesamt: aktiv,
    abgelaufenInPipeline: Number(z.abgelaufen),
    bewertet: Number(z.bewertet),
    versandfertig,
    versendet: Number(z.versendet),
    avgScore: z.avg_score == null ? null : Number(z.avg_score),
    pipeline: {
      neu,
      bewertet: bewertetStufe,
      versandfertig,
      beworben,
      rueckmeldung,
    },
    emailVersandfertig: Number(z.email_versandfertig),
    portalVersandfertig: Number(z.portal_versandfertig),
    ungeklaert: Number(z.ungeklaert),
    heuteNeu: Number(z.heute_neu),
    rueckmeldungen: Number(z.rueckmeldungen),
    arbeitsgebiete,
    scoreHistogramm,
  };
}

export interface VersandfertigFeedZeile {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  ort: string | null;
  quelle: string | null;
  score: number | null;
  score_richtung: string | null;
  ist_vermittler: boolean | null;
}

// Versandfertig-Feed der Übersicht: die besten anschreiben_erstellt-Stellen.
export async function getVersandfertigFeed(
  limit = 6
): Promise<VersandfertigFeedZeile[]> {
  const { rows } = await pool.query<VersandfertigFeedZeile>(
    `SELECT refnr, titel, arbeitgeber, ort, quelle, score, score_richtung, ist_vermittler
     FROM stellen
     WHERE status = 'anschreiben_erstellt'
     ORDER BY score DESC NULLS LAST, arbeitgeber ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export interface NachschubSerien {
  ba: number[];
  adzuna: number[];
  tage: string[]; // ISO-Datum je Punkt (ältester zuerst)
}

// Neue Stellen pro Tag, getrennt nach Arbeitsagentur (bundesagentur) und Adzuna,
// für den Nachschub-Flächenchart. Andere Quellen (z. B. manuell) bleiben außen
// vor — der Chart hat nur diese zwei Serien.
// LISTE_FILTER ausschließen: aussortierte/fehlerhafte Importe sind kein echter
// Nachschub und werden app-weit (Pipeline, Listen) nicht gezählt — sonst zeigt
// der Chart deutlich mehr als die aktive Pipeline (z. B. 1052 statt 807 aktiv).
export async function getNachschubProQuelle(
  tage: number
): Promise<NachschubSerien> {
  const heute = heuteBerlin();
  const { rows } = await pool.query<{ tag: string; quelle: string | null; n: number }>(
    `SELECT erstellt_am::date::text AS tag, quelle, count(*)::int AS n
       FROM stellen
      WHERE erstellt_am::date > $1::date - $2::int
        AND erstellt_am::date <= $1::date
        AND ${LISTE_FILTER}
      GROUP BY 1, 2`,
    [heute, tage]
  );

  const baProTag = new Map<string, number>();
  const adProTag = new Map<string, number>();
  for (const r of rows) {
    if (r.quelle === "bundesagentur") baProTag.set(r.tag, (baProTag.get(r.tag) ?? 0) + r.n);
    else if (r.quelle === "adzuna") adProTag.set(r.tag, (adProTag.get(r.tag) ?? 0) + r.n);
  }

  const heuteUtc = new Date(`${heute}T00:00:00Z`);
  const tageListe = Array.from({ length: tage }, (_, i) =>
    new Date(heuteUtc.getTime() - (tage - 1 - i) * 86_400_000).toISOString().slice(0, 10)
  );
  return {
    tage: tageListe,
    ba: tageListe.map((t) => baProTag.get(t) ?? 0),
    adzuna: tageListe.map((t) => adProTag.get(t) ?? 0),
  };
}

export interface VersandfertigDetail {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  ort: string | null;
  quelle: string | null;
  score: number | null;
  score_richtung: string | null;
  bewerbungskanal: string | null;
  bewerbung_email: string | null;
  formular_url: string | null;
  externe_url: string | null;
  anschreiben: string | null;
  ist_vermittler: boolean | null;
  veroeffentlicht: string | null; // ISO-Datum (YYYY-MM-DD) oder null
  arbeitsgebiet: string | null;
}

// Freigabe-Queue: alle versandfertigen Stellen (anschreiben_erstellt), inkl.
// echtem Anschreiben-Text und Versandweg-Feldern. Nur lesend.
export async function getVersandfertigDetails(): Promise<VersandfertigDetail[]> {
  const { rows } = await pool.query<VersandfertigDetail>(
    `SELECT refnr, titel, arbeitgeber, ort, quelle, score, score_richtung,
            bewerbungskanal, bewerbung_email, formular_url, externe_url, anschreiben,
            ist_vermittler, veroeffentlicht::text AS veroeffentlicht, arbeitsgebiet
     FROM stellen
     WHERE status = 'anschreiben_erstellt'
     ORDER BY score DESC NULLS LAST, arbeitgeber ASC`
  );
  return rows;
}

export async function getStelle(refnr: string): Promise<StelleDetail | null> {
  const { rows } = await pool.query<StelleDetail>(
    `SELECT refnr, titel, arbeitgeber, ort, plz, quelle, status, score, score_text,
            score_richtung, externe_url, bewerbung_email, bewerbungskanal, formular_url,
            anschreiben, versendet_am, ist_vermittler, scout_geprueft_am, scout_fund_email,
            beschreibung, erkundung_vorschlag, erkundung_vorschlag_am,
            notiz, arbeitsgebiet, veroeffentlicht::text AS veroeffentlicht,
            erstellt_am, bewertet_am, rueckmeldung, rueckmeldung_am,
            rueckmeldung_zusammenfassung, gespraech_am, gespraech_ort
     FROM stellen
     WHERE refnr = $1`,
    [refnr]
  );
  return rows[0] ?? null;
}

// Scout hat die Stelle geprüft, aber keine übernehmbare Adresse gefunden und
// es ist auch keine bewerbung_email gesetzt → Bewerbung läuft über Portal/Formular.
export function scoutGeprueftOhneEmail(stelle: {
  scout_geprueft_am: Date | null;
  scout_fund_email: string | null;
  bewerbung_email: string | null;
}): boolean {
  return (
    stelle.scout_geprueft_am !== null &&
    stelle.scout_fund_email === null &&
    stelle.bewerbung_email === null
  );
}

export interface EmailVorschlag {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  score: number | null;
  quelle: string | null;
  scout_fund_email: string;
  scout_fund_quelle: string | null;
}

// Offene E-Mail-Scout-Funde: Adresse gefunden, aber Kanal noch nicht übernommen.
export async function getEmailVorschlaege(): Promise<EmailVorschlag[]> {
  const { rows } = await pool.query<EmailVorschlag>(
    `SELECT refnr, titel, arbeitgeber, score, quelle, scout_fund_email, scout_fund_quelle
     FROM stellen
     WHERE scout_fund_email IS NOT NULL AND bewerbung_email IS NULL
     ORDER BY score DESC NULLS LAST, arbeitgeber ASC`
  );
  return rows;
}

// =====================================================================
// Rückmeldungen — LIVE aus stellen (ersetzt den früheren Demo-Mock).
// Kategorie steht in `rueckmeldung` (absage|zusage|einladung|eingangs-
// bestaetigung), Termin in gespraech_am/-ort, Kurzfassung in
// rueckmeldung_zusammenfassung. Unscharfe Fuzzy-Treffer des n8n-Trackers
// liegen als JSON in rueckmeldung_vorschlag und werden hier zu „Zu bestätigen".
// =====================================================================
const TZ = "Europe/Berlin";
function tzDatum(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}
function tzZeit(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}
// Ganze Kalendertage zwischen zwei Zeitpunkten, in Berlin-Tagen gerechnet.
function tageDiff(von: Date, bis: Date): number {
  const a = Date.parse(`${tzDatum(von)}T00:00:00Z`);
  const b = Date.parse(`${tzDatum(bis)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
function relativ(d: Date, jetzt: Date): string {
  const tage = tageDiff(d, jetzt); // Tage in der Vergangenheit
  if (tage <= 0) return `heute · ${tzZeit(d)}`;
  if (tage === 1) return "gestern";
  return `vor ${tage} Tagen`;
}
function countdown(d: Date, jetzt: Date): string {
  const tage = tageDiff(jetzt, d); // Tage in der Zukunft
  if (tage < 0) return "vergangen";
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}
function gespraechDatum(d: Date): string {
  const wd = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, weekday: "short" }).format(d);
  const dat = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  return `${wd}, ${dat} · ${tzZeit(d)} Uhr`;
}

export interface RueckKpi {
  label: string;
  wert: string;
  foot: string;
}
export interface RueckHero {
  firma: string;
  role: string;
  datum: string;
  terminISO: string; // YYYY-MM-DD (Europe/Berlin) — Quelle für den Monatskalender
  startISO: string; // voller ISO-Zeitpunkt (mit Uhrzeit) — Quelle für den ICS-Export
  ort: string;
  summary: string;
  countdown: string;
}
export interface RueckBestaetigen {
  refnr: string;
  firma: string;
  von: string;
  when: string;
  badge: string;
  confidence?: string;
  summary: string;
  hint?: string;
}
export interface RueckEingang {
  refnr: string;
  firma: string;
  von: string;
  when: string; // relativ aus rueckmeldung_vorschlag_am — Kopfzeile
  empfangen: string; // formatiertes empfangen_am — aufgeklappte Detailansicht
  summary: string;
}
export interface RueckAngekommen {
  refnr: string;
  firma: string;
  role: string;
  when: string; // relativ aus rueckmeldung_am — "gesehen am"
  summary: string;
}
export interface RueckZusage {
  firma: string;
  role: string;
  when: string;
  summary: string;
}
export interface RueckEinladung {
  firma: string;
  role: string;
  when: string;
  datum: string;
  format: string;
  summary: string;
}
export interface RueckWartet {
  refnr: string;
  firma: string;
  when: string;
}
export interface RueckAbsage {
  refnr: string;
  firma: string;
  role: string;
  when: string;
  summary: string;
}
export interface RueckmeldungenDaten {
  kpis: {
    versendet: RueckKpi;
    antworten: RueckKpi;
    einladungen: RueckKpi;
    zusagen: RueckKpi;
    absagen: RueckKpi;
    einladungsquote: RueckKpi;
  };
  hero: RueckHero | null;
  zuBestaetigen: RueckBestaetigen[];
  eingangsbestaetigungen: RueckEingang[];
  angekommen: RueckAngekommen[];
  zusagen: RueckZusage[];
  einladungen: RueckEinladung[];
  wartet: RueckWartet[];
  absagen: RueckAbsage[];
}

interface RueckZeile {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  status: string | null;
  rueckmeldung: string | null;
  rueckmeldung_am: Date | null;
  rueckmeldung_zusammenfassung: string | null;
  gespraech_am: Date | null;
  gespraech_ort: string | null;
  versendet_am: Date | null;
  rueckmeldung_vorschlag: {
    kategorie?: string;
    zusammenfassung?: string;
    gespraech_am?: string | null;
    gespraech_ort?: string | null;
    confidence?: string;
    quelle?: string;
    von?: string;
    empfangen_am?: string; // E-Mail-Empfangsdatum (ISO) → rueckmeldung_am beim Übernehmen
  } | null;
  rueckmeldung_vorschlag_am: Date | null;
}

// Vorschlags-Kategorie, die als eigene Box läuft (nicht in "Zu bestätigen").
const EINGANG = "eingangsbestaetigung";
const VORSCHLAG_BADGE: Record<string, string> = {
  firma: "Firmenname im Betreff erkannt",
  domain: "Gleiche Domain wie die Bewerbung",
};
const PROZENT = (zaehler: number, nenner: number) =>
  nenner > 0 ? `${Math.round((zaehler / nenner) * 100)} %` : "—";

export async function getRueckmeldungen(): Promise<RueckmeldungenDaten> {
  const jetzt = new Date();

  const kennzahlen = pool.query<{
    versendet: string;
    antworten: string;
    einladungen: string;
    zusagen: string;
    absagen: string;
  }>(
    `SELECT
       count(*) FILTER (WHERE versendet_am IS NOT NULL) AS versendet,
       count(*) FILTER (WHERE rueckmeldung IS NOT NULL AND rueckmeldung NOT IN ('irrelevant', '${EINGANG}')) AS antworten,
       count(*) FILTER (WHERE rueckmeldung = 'einladung') AS einladungen,
       count(*) FILTER (WHERE rueckmeldung = 'zusage') AS zusagen,
       count(*) FILTER (WHERE rueckmeldung = 'absage') AS absagen
     FROM stellen`
  );

  const zeilenQ = pool.query<RueckZeile>(
    `SELECT refnr, titel, arbeitgeber, status,
            rueckmeldung, rueckmeldung_am, rueckmeldung_zusammenfassung,
            gespraech_am, gespraech_ort, versendet_am,
            rueckmeldung_vorschlag, rueckmeldung_vorschlag_am
       FROM stellen
      WHERE versendet_am IS NOT NULL
         OR rueckmeldung IS NOT NULL
         OR rueckmeldung_vorschlag IS NOT NULL`
  );

  const [k, z] = await Promise.all([kennzahlen, zeilenQ]);
  const kz = k.rows[0];
  const versendet = Number(kz.versendet);
  const antworten = Number(kz.antworten);
  const einladungen = Number(kz.einladungen);
  const zusagen = Number(kz.zusagen);
  const absagen = Number(kz.absagen);
  const zeilen = z.rows;

  const firma = (r: RueckZeile) => r.arbeitgeber ?? "Unbekannt";
  const role = (r: RueckZeile) => r.titel ?? "Ohne Titel";

  // Hero = frühestes NOCH KOMMENDES Gespräch (Einladung mit gespraech_am ≥ jetzt).
  const kommendeGespraeche = zeilen
    .filter((r) => r.rueckmeldung === "einladung" && r.gespraech_am && r.gespraech_am >= jetzt)
    .sort((a, b) => a.gespraech_am!.getTime() - b.gespraech_am!.getTime());
  const heroZeile = kommendeGespraeche[0] ?? null;

  const hero: RueckHero | null = heroZeile
    ? {
        firma: firma(heroZeile),
        role: role(heroZeile),
        datum: gespraechDatum(heroZeile.gespraech_am!),
        terminISO: tzDatum(heroZeile.gespraech_am!),
        startISO: heroZeile.gespraech_am!.toISOString(),
        ort: heroZeile.gespraech_ort ?? "Ort folgt",
        summary: heroZeile.rueckmeldung_zusammenfassung ?? "",
        countdown: countdown(heroZeile.gespraech_am!, jetzt),
      }
    : null;

  const zuBestaetigen: RueckBestaetigen[] = zeilen
    .filter((r) => r.rueckmeldung_vorschlag && r.rueckmeldung_vorschlag.kategorie !== EINGANG)
    .sort(
      (a, b) =>
        (b.rueckmeldung_vorschlag_am?.getTime() ?? 0) -
        (a.rueckmeldung_vorschlag_am?.getTime() ?? 0)
    )
    .map((r) => {
      const v = r.rueckmeldung_vorschlag!;
      return {
        refnr: r.refnr,
        firma: firma(r),
        von: v.von ?? "unbekannter Absender",
        when: r.rueckmeldung_vorschlag_am ? relativ(r.rueckmeldung_vorschlag_am, jetzt) : "",
        badge: VORSCHLAG_BADGE[v.quelle ?? ""] ?? "Unscharfer Treffer",
        confidence: v.confidence,
        summary: v.zusammenfassung ?? "",
        hint: "Ersetzt den alten Telegram-Vorschlag — du entscheidest hier per Knopf.",
      };
    });

  const eingangsbestaetigungen: RueckEingang[] = zeilen
    .filter((r) => r.rueckmeldung_vorschlag?.kategorie === EINGANG)
    .sort(
      (a, b) =>
        (b.rueckmeldung_vorschlag_am?.getTime() ?? 0) -
        (a.rueckmeldung_vorschlag_am?.getTime() ?? 0)
    )
    .map((r) => {
      const v = r.rueckmeldung_vorschlag!;
      return {
        refnr: r.refnr,
        firma: firma(r),
        von: v.von ?? "unbekannter Absender",
        when: r.rueckmeldung_vorschlag_am ? relativ(r.rueckmeldung_vorschlag_am, jetzt) : "",
        empfangen: v.empfangen_am ? gespraechDatum(new Date(v.empfangen_am)) : "",
        summary: v.zusammenfassung ?? "",
      };
    });

  // Angekommen = bereits gesehene Eingangsbestätigungen (Vorschlag übernommen).
  const angekommen: RueckAngekommen[] = zeilen
    .filter((r) => r.rueckmeldung === EINGANG)
    .sort((a, b) => (b.rueckmeldung_am?.getTime() ?? 0) - (a.rueckmeldung_am?.getTime() ?? 0))
    .map((r) => ({
      refnr: r.refnr,
      firma: firma(r),
      role: role(r),
      when: r.rueckmeldung_am ? relativ(r.rueckmeldung_am, jetzt) : "",
      summary: r.rueckmeldung_zusammenfassung ?? "",
    }));

  const zusagenListe: RueckZusage[] = zeilen
    .filter((r) => r.rueckmeldung === "zusage")
    .sort((a, b) => (b.rueckmeldung_am?.getTime() ?? 0) - (a.rueckmeldung_am?.getTime() ?? 0))
    .map((r) => ({
      firma: firma(r),
      role: role(r),
      when: r.rueckmeldung_am ? relativ(r.rueckmeldung_am, jetzt) : "",
      summary: r.rueckmeldung_zusammenfassung ?? "",
    }));

  // Weitere Einladungen = alle Einladungen außer der Hero-Zeile.
  const einladungenListe: RueckEinladung[] = zeilen
    .filter((r) => r.rueckmeldung === "einladung" && r.refnr !== heroZeile?.refnr)
    .sort((a, b) => (a.gespraech_am?.getTime() ?? 0) - (b.gespraech_am?.getTime() ?? 0))
    .map((r) => ({
      firma: firma(r),
      role: role(r),
      when: r.rueckmeldung_am ? relativ(r.rueckmeldung_am, jetzt) : "",
      datum: r.gespraech_am ? gespraechDatum(r.gespraech_am) : "Termin folgt",
      format: r.gespraech_ort ?? "Format folgt",
      summary: r.rueckmeldung_zusammenfassung ?? "",
    }));

  const absagenListe: RueckAbsage[] = zeilen
    .filter((r) => r.rueckmeldung === "absage")
    .sort((a, b) => (b.rueckmeldung_am?.getTime() ?? 0) - (a.rueckmeldung_am?.getTime() ?? 0))
    .map((r) => ({
      refnr: r.refnr,
      firma: firma(r),
      role: role(r),
      when: r.rueckmeldung_am ? relativ(r.rueckmeldung_am, jetzt) : "",
      summary: r.rueckmeldung_zusammenfassung ?? "",
    }));

  // Wartet = versendet, noch keine Antwort, nicht unzustellbar (Bounce).
  const wartetListe: RueckWartet[] = zeilen
    .filter(
      (r) => r.versendet_am && r.rueckmeldung === null && r.status !== "unzustellbar"
    )
    .sort((a, b) => (a.versendet_am?.getTime() ?? 0) - (b.versendet_am?.getTime() ?? 0))
    .map((r) => ({
      refnr: r.refnr,
      firma: firma(r),
      when: r.versendet_am ? relativ(r.versendet_am, jetzt) : "",
    }));

  return {
    kpis: {
      versendet: { label: "Versendet", wert: String(versendet), foot: "Bewerbungen raus" },
      antworten: {
        label: "Antworten",
        wert: String(antworten),
        foot: `${PROZENT(antworten, versendet)} Antwortquote`,
      },
      einladungen: { label: "Einladungen", wert: String(einladungen), foot: "Gespräche" },
      zusagen: { label: "Zusagen", wert: String(zusagen), foot: "Angebot erhalten" },
      absagen: { label: "Absagen", wert: String(absagen), foot: "abgeschlossen" },
      einladungsquote: {
        label: "Einladungsquote",
        wert: PROZENT(einladungen, versendet),
        foot: `${einladungen} von ${versendet} versendet`,
      },
    },
    hero,
    zuBestaetigen,
    eingangsbestaetigungen,
    angekommen,
    zusagen: zusagenListe,
    einladungen: einladungenListe,
    wartet: wartetListe,
    absagen: absagenListe,
  };
}

export interface ScoutZeile {
  refnr: string;
  titel: string | null;
  arbeitgeber: string | null;
  quelle: string | null;
  externe_url: string | null;
  formular_url: string | null;
  adresse: string | null; // bewerbung_email bei "bestätigt", sonst null
}

export interface ScoutDaten {
  stats: { zurBestaetigung: number; bestaetigt: number; ohneAdresse: number };
  letzterLauf: Date | null;
  poolOffen: number;
  vorschlaege: EmailVorschlag[];
  ohneAdresse: ScoutZeile[];
  bestaetigt: ScoutZeile[];
}

// Alle Daten der E-Mail-Scout-Seite (read-only): Vorschläge (scout_fund_email),
// ohne Adresse (gescoutet, nichts gefunden) und bestätigte Adressen.
export async function getScoutDaten(): Promise<ScoutDaten> {
  const kennzahlen = pool.query<{
    zur_bestaetigung: string;
    bestaetigt: string;
    ohne_adresse: string;
    letzter_lauf: Date | null;
    pool_offen: string;
  }>(
    `SELECT
       count(*) FILTER (WHERE scout_fund_email IS NOT NULL AND bewerbung_email IS NULL) AS zur_bestaetigung,
       count(*) FILTER (WHERE bewerbung_email IS NOT NULL AND bewerbungskanal = 'email') AS bestaetigt,
       count(*) FILTER (WHERE scout_geprueft_am IS NOT NULL AND scout_fund_email IS NULL AND bewerbung_email IS NULL) AS ohne_adresse,
       max(scout_geprueft_am) AS letzter_lauf,
       count(*) FILTER (WHERE ${LISTE_FILTER} AND scout_geprueft_am IS NULL AND bewerbungskanal IS NULL AND score >= ${SCOUT_SCHWELLE}) AS pool_offen
     FROM stellen`
  );

  const ohneAdresse = pool.query<ScoutZeile>(
    `SELECT refnr, titel, arbeitgeber, quelle, externe_url, formular_url, NULL::text AS adresse
     FROM stellen
     WHERE scout_geprueft_am IS NOT NULL AND scout_fund_email IS NULL AND bewerbung_email IS NULL
     ORDER BY score DESC NULLS LAST, arbeitgeber ASC
     LIMIT 12`
  );

  const bestaetigt = pool.query<ScoutZeile>(
    `SELECT refnr, titel, arbeitgeber, quelle, externe_url, formular_url, bewerbung_email AS adresse
     FROM stellen
     WHERE bewerbung_email IS NOT NULL AND bewerbungskanal = 'email'
     ORDER BY arbeitgeber ASC
     LIMIT 12`
  );

  const [k, o, b, vorschlaege] = await Promise.all([
    kennzahlen,
    ohneAdresse,
    bestaetigt,
    getEmailVorschlaege(),
  ]);
  const z = k.rows[0];

  return {
    stats: {
      zurBestaetigung: Number(z.zur_bestaetigung),
      bestaetigt: Number(z.bestaetigt),
      ohneAdresse: Number(z.ohne_adresse),
    },
    letzterLauf: z.letzter_lauf,
    poolOffen: Number(z.pool_offen),
    vorschlaege,
    ohneAdresse: o.rows,
    bestaetigt: b.rows,
  };
}

export interface StatusAnzahl {
  status: string;
  anzahl: number;
}

// Single source for KPI counts and the pipeline band
export async function getStatusVerteilung(): Promise<StatusAnzahl[]> {
  const { rows } = await pool.query<{ status: string | null; anzahl: string }>(
    "SELECT status, count(*) AS anzahl FROM stellen GROUP BY status"
  );
  return rows.map((r) => ({
    status: r.status ?? "unbekannt",
    anzahl: Number(r.anzahl),
  }));
}

// Column identifiers cannot be parameterized, so only whitelisted
// time columns are allowed. erstellt_am is a naive timestamp that is
// already stored in local time; the other two are timestamptz.
const ZEIT_SPALTEN = {
  versendet_am: "(versendet_am AT TIME ZONE 'Europe/Berlin')::date",
  bewertet_am: "(bewertet_am AT TIME ZONE 'Europe/Berlin')::date",
  erstellt_am: "erstellt_am::date",
} as const;

export type ZeitSpalte = keyof typeof ZEIT_SPALTEN;

// Heutiger Kalendertag in Europe/Berlin (YYYY-MM-DD). Anker für den
// Nachschub-Chart UND den "Eingetroffen"-Filter — beide müssen denselben
// "Heute"-Begriff verwenden.
export function heuteBerlin(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
}

// Counts per day for the last `tage` days (oldest first), today included.
// Days without rows are filled with 0 so sparklines get a complete series.
export async function getCountsProTag(
  spalte: ZeitSpalte,
  tage: number
): Promise<number[]> {
  const tagAusdruck = ZEIT_SPALTEN[spalte];
  const heute = heuteBerlin();
  const { rows } = await pool.query<{ tag: string; n: number }>(
    `SELECT ${tagAusdruck}::text AS tag, count(*)::int AS n
     FROM stellen
     WHERE ${spalte} IS NOT NULL
       AND ${tagAusdruck} > $1::date - $2::int
       AND ${tagAusdruck} <= $1::date
     GROUP BY 1`,
    [heute, tage]
  );

  const proTag = new Map(rows.map((r) => [r.tag, r.n]));
  const heuteUtc = new Date(`${heute}T00:00:00Z`);
  return Array.from({ length: tage }, (_, i) => {
    const tag = new Date(heuteUtc.getTime() - (tage - 1 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return proTag.get(tag) ?? 0;
  });
}

export async function getDownloadInfo(refnr: string): Promise<{
  arbeitgeber: string | null;
  score_richtung: string | null;
} | null> {
  const { rows } = await pool.query<{
    arbeitgeber: string | null;
    score_richtung: string | null;
  }>("SELECT arbeitgeber, score_richtung FROM stellen WHERE refnr = $1", [refnr]);
  return rows[0] ?? null;
}

export function bewerbungsUrl(stelle: {
  externe_url: string | null;
  refnr: string;
}): string {
  return (
    stelle.externe_url ??
    `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(stelle.refnr)}`
  );
}

// Read-only Anzeige-Filter für Vermittler/Zeitfirma-Stellen.
// Direkt = alles außer echtem true (false oder NULL gelten als Direkt),
// Zeitfirma = ist_vermittler === true.
export type VermittlerFilter = "alle" | "direkt" | "zeitfirma";

export function parseVermittlerFilter(wert: string | undefined): VermittlerFilter {
  return wert === "direkt" || wert === "zeitfirma" ? wert : "alle";
}

export function passtVermittlerFilter(
  istVermittler: boolean | null,
  filter: VermittlerFilter
): boolean {
  if (filter === "zeitfirma") return istVermittler === true;
  if (filter === "direkt") return istVermittler !== true;
  return true;
}

export const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  shortlist: "Shortlist",
  anschreiben_erstellt: "Versandfertig",
  anschreiben_manuell: "Anschreiben manuell",
  nachbewertet: "Nachbewertet",
  bewertet: "Bewertet",
  versendet: "Versendet",
  aussortiert: "Aussortiert",
  abgelaufen: "Abgelaufen",
  fehler: "Fehler",
};

// Pipeline-Reihenfolge fürs Statusboard; aussortiert/fehler werden eingeklappt
export const PIPELINE_STATUS = [
  "anschreiben_erstellt",
  "anschreiben_manuell",
  "nachbewertet",
  "bewertet",
  "versendet",
] as const;

export const EINGEKLAPPTE_STATUS = ["aussortiert", "abgelaufen", "fehler"] as const;
