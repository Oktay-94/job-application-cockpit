import { AlertTriangle } from "lucide-react";
import { VersandfertigClient } from "@/components/versandfertig/versandfertig-client";
import { getVersandfertigDetails } from "@/lib/stellen";
import { refnrSafe, vorhandeneRefnrOrdner } from "@/lib/dokumente";

export const dynamic = "force-dynamic";

// "vor X Tagen veröffentlicht" (bzw. Datum bei alten Anzeigen), server-seitig
// in Europe/Berlin — kein Client-Date, daher kein Hydration-Mismatch.
function frischeText(iso: string | null): string | null {
  if (!iso) return null;
  const heuteISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(
    new Date()
  );
  const tage = Math.round(
    (new Date(heuteISO).getTime() - new Date(iso).getTime()) / 86_400_000
  );
  if (tage <= 0) return "heute veröffentlicht";
  if (tage === 1) return "gestern veröffentlicht";
  if (tage <= 60) return `vor ${tage} Tagen veröffentlicht`;
  const [j, m, t] = iso.split("-");
  return `veröffentlicht am ${t}.${m}.${j}`;
}

export default async function VersandfertigSeite() {
  const [stellen, ordner] = await Promise.all([
    getVersandfertigDetails(),
    vorhandeneRefnrOrdner(),
  ]);

  // Ordner-Button nur aktiv, wenn der Firmen-Ordner sicher auflösbar ist.
  const mitOrdner = stellen.map((s) => {
    const safe = refnrSafe(s.refnr);
    return { ...s, ordnerOk: !!safe && ordner.has(safe), frische: frischeText(s.veroeffentlicht) };
  });

  const cvEntw = stellen.filter((s) => s.score_richtung === "entwicklung").length;
  const cvSys = stellen.length - cvEntw;
  const perForm = stellen.filter((s) => s.bewerbungskanal !== "email").length;

  return (
    <>
      <div className="ctxbar">
        <span className="ctx-big">
          <b className="num">{stellen.length}</b> bereit zum Versand
        </span>
        <span className="ctx-note">
          <AlertTriangle strokeWidth={2} />
          Einmaliger Versand · eine Bewerbung pro Firma
        </span>
        <div className="ctx-spacer" />
        <span className="ctx-breakdown num">
          {cvEntw}× CV Entwicklung · {cvSys}× CV Sysadmin · {perForm} per Formular/Portal
        </span>
      </div>

      <VersandfertigClient stellen={mitOrdner} />
    </>
  );
}
