"use client";

import { useState } from "react";
import { ClipboardList, ExternalLink, Info } from "lucide-react";
import { AccordionCard } from "./akkordeon-karte";

type Status = "idle" | "laeuft" | "text" | "leer" | "fehler";

// Stellenanzeige als Akkordeon — einheitlich für BA und Adzuna/manuell:
// - DB-Text vorhanden (Adzuna/manuell) → direkt zeigen, kein Fetch.
// - kein DB-Text (BA) → beim ERSTEN Aufklappen live über
//   /api/ba-beschreibung/[refnr] nachladen (nur Anzeige, kein DB-Write).
// Beide Quellen sehen gleich aus: Balken auf → Text erscheint. Kein separater
// "Volltext laden"-Knopf mehr (ersetzt BaBeschreibungButton).
export function StellenanzeigeKarte({
  refnr,
  beschreibung,
  quelle,
  anzeigeUrl,
}: {
  refnr: string;
  beschreibung: string | null;
  quelle: string | null;
  anzeigeUrl: string | null;
}) {
  const hatDbText = !!beschreibung && beschreibung.trim().length > 0;
  const istBa = quelle === "bundesagentur";
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");

  // Beim ersten Aufklappen: BA-Text live laden (nur wenn kein DB-Text da ist).
  async function beimOeffnen() {
    if (hatDbText || !istBa) return;
    setStatus("laeuft");
    try {
      const res = await fetch(`/api/ba-beschreibung/${encodeURIComponent(refnr)}`);
      if (!res.ok) return setStatus("fehler");
      const data: { text?: string } = await res.json().catch(() => ({}));
      const t = (data.text ?? "").trim();
      if (t.length > 0) {
        setText(t);
        setStatus("text");
      } else {
        setStatus("leer"); // tote/abgelaufene Anzeige oder API leer
      }
    } catch {
      setStatus("fehler");
    }
  }

  const headAction = anzeigeUrl ? (
    <a className="head-action" href={anzeigeUrl} target="_blank" rel="noopener noreferrer">
      Anzeige öffnen
      <ExternalLink strokeWidth={2} />
    </a>
  ) : undefined;

  return (
    <AccordionCard
      icon={<ClipboardList className="ic" strokeWidth={2} />}
      titel="Stellenanzeige"
      defaultDesktop={false}
      defaultHandy={false}
      headAction={headAction}
      onOpen={beimOeffnen}
    >
      {hatDbText ? (
        <div className="posting">{beschreibung}</div>
      ) : !istBa ? (
        <p style={{ color: "var(--fg-muted)", fontSize: "14px" }}>Kein Anzeigentext hinterlegt.</p>
      ) : status === "text" ? (
        <div className="posting">{text}</div>
      ) : status === "leer" ? (
        <p style={{ color: "var(--fg-muted)", fontSize: "14px" }}>
          Anzeige nicht mehr verfügbar — vermutlich offline oder zurückgezogen.
        </p>
      ) : status === "fehler" ? (
        <p style={{ color: "#dc2626", fontSize: "14px" }}>
          Konnte den Anzeigentext nicht laden — bitte die Karte erneut auf- und zuklappen.
        </p>
      ) : (
        <p style={{ color: "var(--fg-muted)", fontSize: "14px" }}>Lädt Anzeigentext …</p>
      )}
      <div className="posting-foot">
        <Info strokeWidth={2} />
        Originaltext aus der Anzeige · vor dem Senden über „Anzeige öffnen“ prüfen, ob sie noch online ist.
      </div>
    </AccordionCard>
  );
}
