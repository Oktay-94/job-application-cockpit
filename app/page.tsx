import { KpiKarten } from "@/components/uebersicht/kpi-karten";
import { PipelineBand } from "@/components/uebersicht/pipeline-band";
import { VersandfertigFeed } from "@/components/uebersicht/versandfertig-feed";
import { Arbeitsgebiete, ScoreHistogramm } from "@/components/uebersicht/verteilungen";
import { NachschubChart } from "@/components/uebersicht/nachschub-chart";
import { EmailVorschlaege } from "@/components/email-vorschlaege";
import {
  getCountsProTag,
  getDashboardDaten,
  getEmailVorschlaege,
  getNachschubProQuelle,
  getVersandfertigFeed,
} from "@/lib/stellen";

export const dynamic = "force-dynamic";

const NACHSCHUB_TAGE = 30;

// Übersicht – 1:1 nach cockpit-uebersicht-mockup.html. Begrüßung steht in der
// Topbar; der Inhalt startet direkt mit den KPI-Karten. Rendert in die
// .content-Spalte der Shell (Padding/Gap kommen von dort).
export default async function Uebersicht() {
  const [daten, feed, nachschub, inflow, emailVorschlaege] = await Promise.all([
    getDashboardDaten(),
    getVersandfertigFeed(6),
    getNachschubProQuelle(NACHSCHUB_TAGE),
    getCountsProTag("erstellt_am", NACHSCHUB_TAGE),
    getEmailVorschlaege(),
  ]);

  const neu7 = inflow.slice(-7).reduce((a, b) => a + b, 0);
  const spark = inflow.slice(-8);

  return (
    <>
      <KpiKarten daten={daten} spark={spark} neu7={neu7} />
      <PipelineBand daten={daten} />

      <div className="split">
        <VersandfertigFeed feed={feed} />
        <div className="stack">
          <Arbeitsgebiete daten={daten} />
          <ScoreHistogramm daten={daten} />
        </div>
      </div>

      <NachschubChart serien={nachschub} />

      {emailVorschlaege.length > 0 && (
        <EmailVorschlaege vorschlaege={emailVorschlaege} />
      )}
    </>
  );
}
