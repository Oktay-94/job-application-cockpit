import { StellenTabelle, type StellenStart } from "@/components/stellen/stellen-tabelle";
import { MobilAktionen } from "@/components/stellen/mobil-aktionen";
import { StelleAufnehmen } from "@/components/stelle-aufnehmen";
import { ARBEITSGEBIET_SLUG, getAbgelaufeneAnzahl, getStellenListe, heuteBerlin } from "@/lib/stellen";

export const dynamic = "force-dynamic";

const STATUS_WERTE = new Set(["neu", "bewertet", "versandfertig", "beworben"]);
const QUELLE_WERTE = new Set(["bundesagentur", "adzuna", "manuell"]);
const KANAL_WERTE = new Set(["email", "webform", "ungeklaert", "tot"]);
const GEBIET_SLUGS = new Set<string>(Object.values(ARBEITSGEBIET_SLUG));

// searchParams → Start-Filter (Deep-Links). Werte können kommasepariert sein;
// Unbekanntes wird still verworfen.
function leseFilter(p: Record<string, string | string[] | undefined>): StellenStart {
  const eins = (k: string) => (Array.isArray(p[k]) ? p[k][0] : p[k]) ?? "";
  const liste = (k: string, erlaubt: Set<string>) =>
    eins(k)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => erlaubt.has(s));

  const arbRoh = eins("arbeitgeber");
  const arbeitgeber: StellenStart["arbeitgeber"] =
    arbRoh === "vermittler" || arbRoh === "zeitfirma" || eins("vermittler") === "1"
      ? "vermittler"
      : arbRoh === "direkt"
        ? "direkt"
        : "alle";

  const eingRoh = eins("eingetroffen");
  const eingetroffen: StellenStart["eingetroffen"] =
    eingRoh === "heute" || eingRoh === "7" || eingRoh === "14" ? eingRoh : "alle";

  // Min-Score: bestehender Scout-Deep-Link nutzt `minScore`, das Score-Histogramm
  // `score_min` — beide akzeptieren, damit kein bestehender Link bricht.
  const minScoreRoh = Number(eins("minScore") || eins("score_min"));
  const maxScoreRoh = Number(eins("score_max"));
  // Exakter Eingetroffen-Tag (Nachschub-Datum-Deep-Link), nur valides YYYY-MM-DD.
  const tagRoh = eins("tag");
  const tag = /^\d{4}-\d{2}-\d{2}$/.test(tagRoh) ? tagRoh : "";
  return {
    status: liste("status", STATUS_WERTE),
    quelle: liste("quelle", QUELLE_WERTE),
    gebiet: liste("gebiet", GEBIET_SLUGS),
    kanal: liste("kanal", KANAL_WERTE),
    arbeitgeber,
    eingetroffen,
    minScore: Number.isFinite(minScoreRoh) && minScoreRoh > 0 ? minScoreRoh : 0,
    maxScore: Number.isFinite(maxScoreRoh) && maxScoreRoh > 0 ? maxScoreRoh : 0,
    tag,
    suche: eins("q"),
  };
}

export default async function StellenSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const friedhof = (Array.isArray(params.friedhof) ? params.friedhof[0] : params.friedhof) === "1";
  // Im Friedhof-Modus die abgelaufenen Stellen laden (sonst aktive Liste);
  // die Friedhof-Anzahl IMMER live aus der DB für das Knopf-Badge.
  const [stellen, abgelaufenCount] = await Promise.all([
    getStellenListe({ friedhof }),
    getAbgelaufeneAnzahl(),
  ]);
  const start = leseFilter(params);

  return (
    <>
      <MobilAktionen />
      <StellenTabelle
        stellen={stellen}
        start={start}
        heute={heuteBerlin()}
        friedhof={friedhof}
        abgelaufenCount={abgelaufenCount}
      />
      <StelleAufnehmen />
    </>
  );
}
