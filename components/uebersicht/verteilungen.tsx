import Link from "next/link";
import {
  ARBEITSGEBIET_ICON,
  ARBEITSGEBIET_LABEL,
  ARBEITSGEBIET_SLUG,
  type DashboardDaten,
} from "@/lib/stellen";

export function Arbeitsgebiete({ daten }: { daten: DashboardDaten }) {
  const gebiete = daten.arbeitsgebiete.filter((g) => g.anzahl > 0);
  const max = Math.max(1, ...gebiete.map((g) => g.anzahl));
  return (
    <div className="card card-pad">
      <div className="section-head">
        <h2>Arbeitsgebiete</h2>
      </div>
      <div className="barlist">
        {gebiete.map((g) => (
          // Deep-Link: nutzt den bestehenden Gebiet-Filter der Stellen-Liste.
          <Link
            className="bar bar-link"
            key={g.gebiet}
            href={`/stellen?gebiet=${ARBEITSGEBIET_SLUG[g.gebiet]}`}
            title={`${ARBEITSGEBIET_LABEL[g.gebiet]} in der Stellen-Liste anzeigen`}
          >
            <div className="bar-fill" style={{ width: `${(g.anzahl / max) * 100}%` }} />
            {ARBEITSGEBIET_ICON[g.gebiet] && (
              <span
                className="asset-ico"
                style={{
                  backgroundImage: `url(${ARBEITSGEBIET_ICON[g.gebiet]})`,
                  position: "relative",
                  zIndex: 1,
                  marginLeft: "11px",
                }}
              />
            )}
            <span className="bar-name">{ARBEITSGEBIET_LABEL[g.gebiet]}</span>
            <span className="bar-val num">{g.anzahl}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Histogramm-Farben je Score-Bereich (1:1 aus dem Mockup).
const HIST_FARBE: Record<string, string> = {
  "90+": "var(--green)",
  "80–89": "#54c79a",
  "70–79": "var(--amber)",
  "60–69": "#f0a955",
  "<60": "var(--red)",
};

// Score-Band → Deep-Link-Query (score_min/score_max der Stellen-Liste).
const HIST_QUERY: Record<string, string> = {
  "90+": "score_min=90",
  "80–89": "score_min=80&score_max=89",
  "70–79": "score_min=70&score_max=79",
  "60–69": "score_min=60&score_max=69",
  "<60": "score_max=59",
};

export function ScoreHistogramm({ daten }: { daten: DashboardDaten }) {
  // Daten kommen aufsteigend (<60 … 90+); Mockup zeigt absteigend (90+ … <60).
  const buckets = [...daten.scoreHistogramm].reverse();
  const max = Math.max(1, ...buckets.map((b) => b.anzahl));
  return (
    <div className="card card-pad">
      <div className="section-head">
        <h2>Score-Verteilung</h2>
      </div>
      <div className="hist">
        {buckets.map((b) => (
          // Deep-Link: Score-Band-Filter (score_min/score_max) der Stellen-Liste.
          <Link
            className="hcol hcol-link"
            key={b.label}
            href={`/stellen?${HIST_QUERY[b.label] ?? ""}`}
            title={`Stellen mit Score ${b.label} anzeigen`}
          >
            <span className="hval num">{b.anzahl}</span>
            <div
              className="hbar"
              style={{
                height: `${Math.max((b.anzahl / max) * 100, 3)}%`,
                background: HIST_FARBE[b.label] ?? "var(--slate)",
              }}
            />
            <span className="hcap">{b.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
