import Link from "next/link";
import { Briefcase, Send, Star, Inbox, ChevronUp, CalendarX } from "lucide-react";
import type { DashboardDaten } from "@/lib/stellen";

// Punkte einer Mini-Sparkline (viewBox 78×30) aus einer realen Tagesreihe.
function sparkPunkte(werte: number[]): string {
  const w = 78,
    h = 30,
    p = 3;
  const max = Math.max(...werte, 1);
  const step = werte.length > 1 ? (w - 2 * p) / (werte.length - 1) : 0;
  return werte
    .map((v, i) => {
      const x = p + i * step;
      const y = h - p - (v / max) * (h - 2 * p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function KpiKarte({
  icon,
  tint,
  label,
  value,
  unit,
  spark,
  sparkColor,
  delta,
  foot,
  muted,
  href,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string | number;
  unit?: string;
  spark?: number[];
  sparkColor?: string;
  delta?: number;
  foot: string;
  muted?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <div className="kpi-top">
        <span className={`kpi-ico ${tint}`}>{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-row2">
        <div
          className="kpi-val num"
          style={muted ? { color: "var(--fg-subtle)" } : undefined}
        >
          {value}
          {unit && <span className="kpi-unit">{unit}</span>}
        </div>
        {spark && spark.length > 1 && (
          <svg className="kpi-spark" viewBox="0 0 78 30" fill="none" preserveAspectRatio="none">
            <polyline
              points={sparkPunkte(spark)}
              stroke={sparkColor ?? "var(--accent)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="kpi-foot">
        {delta !== undefined && (
          <span className="delta up">
            <ChevronUp strokeWidth={3} />+{delta}
          </span>
        )}
        {foot}
      </div>
    </>
  );

  // Mit href wird die ganze Karte ein Link (als Grid-Kind ohnehin blockifiziert,
  // daher kein extra display:block nötig); ohne href bleibt sie ein nicht-
  // klickbarer div.
  return href ? (
    <Link href={href} className="kpi kpi-link">
      {inner}
    </Link>
  ) : (
    <div className="kpi">{inner}</div>
  );
}

export function KpiKarten({
  daten,
  spark,
  neu7,
}: {
  daten: DashboardDaten;
  spark: number[];
  neu7: number;
}) {
  return (
    <div className="kpis">
      <KpiKarte
        icon={<Briefcase strokeWidth={2} />}
        tint="t-indigo"
        label="Stellen in Pipeline"
        value={daten.aktivGesamt}
        spark={spark}
        sparkColor="var(--accent)"
        delta={neu7}
        foot="in 7 Tagen"
        href="/stellen"
      />
      <KpiKarte
        icon={<Send strokeWidth={2} />}
        tint="t-green"
        label="Versandfertig"
        value={daten.versandfertig}
        foot="bereit zum Senden"
        href="/versandfertig"
      />
      <KpiKarte
        icon={<Star strokeWidth={2} />}
        tint="t-amber"
        label="Ø Match-Score"
        value={daten.avgScore ?? "—"}
        unit={daten.avgScore !== null ? "/100" : undefined}
        muted={daten.avgScore === null}
        foot="aktive, bewertete Stellen"
      />
      <KpiKarte
        icon={<Inbox strokeWidth={2} />}
        tint="t-violet"
        label="Rückmeldungen"
        value={daten.rueckmeldungen}
        muted={daten.rueckmeldungen === 0}
        foot={daten.rueckmeldungen === 0 ? "noch keine Antworten" : "Firmen-Antworten"}
        href="/rueckmeldungen"
      />
      <KpiKarte
        icon={<CalendarX strokeWidth={2} />}
        tint="t-slate"
        label="Abgelaufen"
        value={daten.abgelaufenInPipeline}
        muted={daten.abgelaufenInPipeline === 0}
        foot={daten.abgelaufenInPipeline === 0 ? "keine toten Anzeigen" : "Anzeige offline"}
        href="/abgelaufen"
      />
    </div>
  );
}
