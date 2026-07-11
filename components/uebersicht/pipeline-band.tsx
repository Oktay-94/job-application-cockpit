import Link from "next/link";
import type { DashboardDaten } from "@/lib/stellen";

// Signature-Element: proportionaler Fluss der aktiven Pipeline. Segmentbreite
// = Anteil an aktivGesamt; die Summe der 5 Stufen ergibt genau aktivGesamt.
// Jedes Segment verlinkt: die vier Status-Stufen tief in die gefilterte
// Stellen-Liste (?status=<key> — identisch zu den /stellen-Filterwerten), die
// Rückmeldung-Stufe auf die Rückmeldungen-Seite (kein gültiger Stellen-Status).
export function PipelineBand({ daten }: { daten: DashboardDaten }) {
  const p = daten.pipeline;
  const stufen = [
    {
      key: "neu",
      pc: p.neu,
      label: "Neu",
      legende: "Neu eingetroffen",
      bg: "linear-gradient(160deg,#a3afc0,var(--stage-1))",
      dot: "var(--stage-1)",
      href: "/stellen?status=neu",
    },
    {
      key: "bewertet",
      pc: p.bewertet,
      label: "Bewertet",
      legende: "Vom Agent bewertet",
      bg: "linear-gradient(160deg,#7cb6fb,var(--stage-2))",
      dot: "var(--stage-2)",
      href: "/stellen?status=bewertet",
    },
    {
      key: "versandfertig",
      pc: p.versandfertig,
      label: "Versandfertig",
      legende: "Anschreiben fertig",
      bg: "linear-gradient(160deg,#7a7af4,var(--stage-3))",
      dot: "var(--stage-3)",
      href: "/stellen?status=versandfertig",
    },
    {
      key: "beworben",
      pc: p.beworben,
      label: "Beworben",
      legende: "Bewerbung raus",
      bg: "linear-gradient(160deg,#a684f8,var(--stage-4))",
      dot: "var(--stage-4)",
      href: "/stellen?status=beworben",
    },
    {
      key: "rueckmeldung",
      pc: p.rueckmeldung,
      label: "Rückmeldung",
      legende: "Firma hat geantwortet",
      bg: "linear-gradient(160deg,#3fd6a0,var(--stage-5))",
      dot: "var(--stage-5)",
      href: "/rueckmeldungen",
    },
  ];

  return (
    <div className="card card-pad">
      <div className="pipe-head">
        <h2>Bewerbungs-Pipeline</h2>
        <p style={{ color: "var(--fg-muted)", fontSize: "12.5px" }}>
          Wo jede Stelle gerade steht
        </p>
        <div className="pipe-total">
          Gesamt <b className="num">{daten.aktivGesamt}</b> Stellen
        </div>
      </div>
      <div className="pipe-band">
        {stufen.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className="pipe-seg"
            style={{ flex: s.pc, background: s.bg }}
            title={`${s.legende} – Liste öffnen`}
          >
            <span className="pc num">{s.pc}</span>
            <span className="pl">{s.label}</span>
          </Link>
        ))}
      </div>
      <div className="pipe-legend">
        {stufen.map((s) => (
          <div key={s.key} className="pl-item">
            <span className="pl-dot" style={{ background: s.dot }} />
            {s.legende} · <b className="num">{s.pc}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
