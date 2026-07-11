import { Mail, CircleCheckBig, MailX } from "lucide-react";
import { ScoutPanel } from "@/components/scout/scout-panel";
import { ScoutErgebnisse } from "@/components/scout/scout-ergebnisse";
import { getScoutDaten } from "@/lib/stellen";

export const dynamic = "force-dynamic";

// Letzten Scout-Lauf in Europe/Berlin als "heute HH:MM" bzw. "DD.MM. HH:MM".
function formatLauf(d: Date | null): string {
  if (!d) return "noch nie";
  const tz = "Europe/Berlin";
  const tag = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(x);
  const zeit = new Intl.DateTimeFormat("de-DE", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  if (tag(d) === tag(new Date())) return `heute ${zeit} Uhr`;
  const datum = new Intl.DateTimeFormat("de-DE", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
  }).format(d);
  return `${datum} ${zeit} Uhr`;
}

function StatKachel({
  icon,
  tint,
  wert,
  label,
}: {
  icon: React.ReactNode;
  tint: string;
  wert: number;
  label: string;
}) {
  return (
    <div className="stat">
      <span className={`stat-ico ${tint}`}>{icon}</span>
      <div>
        <div className="stat-val num">{wert}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default async function EmailScoutSeite() {
  const daten = await getScoutDaten();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>E-Mail-Scout</h1>
          <p>Findet Bewerbungs-Adressen zu deinen Stellen — du bestätigst, der Scout schreibt nichts selbst.</p>
        </div>
      </div>

      <ScoutPanel letzterLauf={formatLauf(daten.letzterLauf)} poolOffen={daten.poolOffen} />

      <div className="stats">
        <StatKachel
          icon={<Mail strokeWidth={2} />}
          tint="t-indigo"
          wert={daten.stats.zurBestaetigung}
          label="Zur Bestätigung"
        />
        <StatKachel
          icon={<CircleCheckBig strokeWidth={2} />}
          tint="t-green"
          wert={daten.stats.bestaetigt}
          label="Adressen bestätigt"
        />
        <StatKachel
          icon={<MailX strokeWidth={2} />}
          tint="t-slate"
          wert={daten.stats.ohneAdresse}
          label="Ohne Adresse"
        />
      </div>

      <ScoutErgebnisse
        vorschlaege={daten.vorschlaege}
        ohneAdresse={daten.ohneAdresse}
        bestaetigt={daten.bestaetigt}
        ohneAdresseGesamt={daten.stats.ohneAdresse}
        bestaetigtGesamt={daten.stats.bestaetigt}
      />
    </>
  );
}
