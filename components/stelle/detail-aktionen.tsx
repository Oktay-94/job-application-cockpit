"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Check, X, RefreshCw } from "lucide-react";

type Ziel = "beworben" | "tot";

// Aktionen der Detailseite. "In Versandfertig öffnen" ist NUR Navigation
// (kein Sende-Knopf — scharfer Versand bleibt zentral hinter dem Gate).
// "beworben"/"tot" schreiben direkt über /api/status (UPDATE status).
export function DetailAktionen({ refnr }: { refnr: string }) {
  const router = useRouter();
  const [frage, setFrage] = useState<Ziel | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [restampLaeuft, setRestampLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ typ: "ok" | "fehler"; text: string } | null>(null);

  async function setzen(ziel: Ziel) {
    setFrage(null);
    setLaeuft(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refnr, ziel }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (a.ok) {
        setMeldung({ typ: "ok", text: ziel === "beworben" ? "Als beworben markiert." : "Als tot markiert." });
        router.refresh();
      } else {
        setMeldung({ typ: "fehler", text: a.grund ?? "Fehlgeschlagen" });
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
    }
    setLaeuft(false);
  }

  // Restamp: Datumszeile im Anschreiben-PDF auf heute setzen (→ /api/restamp → n8n).
  async function restampen() {
    if (restampLaeuft) return;
    setRestampLaeuft(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/restamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refnr }),
      });
      const a: { ok?: boolean; datum?: string; grund?: string } = await res
        .json()
        .catch(() => ({}));
      if (res.ok && a.ok && a.datum) {
        setMeldung({ typ: "ok", text: `Datum: ${a.datum}` });
      } else {
        setMeldung({ typ: "fehler", text: a.grund ?? `Fehlgeschlagen (HTTP ${res.status})` });
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
    }
    setRestampLaeuft(false);
  }

  return (
    <div className="stack-gap">
      <Link href={`/versandfertig?refnr=${encodeURIComponent(refnr)}`} className="btn btn-primary">
        <Send strokeWidth={2} />
        In Versandfertig öffnen
      </Link>
      <button
        className="btn btn-ghost"
        disabled={restampLaeuft}
        onClick={restampen}
        title="Datumszeile im Anschreiben-PDF auf heute setzen"
      >
        <RefreshCw strokeWidth={2} />
        {restampLaeuft ? "aktualisiere…" : "PDF aktualisieren"}
      </button>
      <button className="btn btn-confirm" disabled={laeuft} onClick={() => setFrage("beworben")}>
        <Check strokeWidth={2} />
        Als beworben markieren
      </button>
      <button className="btn btn-danger-ghost" disabled={laeuft} onClick={() => setFrage("tot")}>
        <X strokeWidth={2} />
        Als tot markieren
      </button>

      {frage && (
        <div className="weg-note" style={{ flexDirection: "column", gap: "9px", alignItems: "stretch" }}>
          <span>
            {frage === "beworben"
              ? "Stelle wirklich als beworben markieren? (Status → versendet)"
              : "Stelle wirklich als tot markieren? (Status → aussortiert)"}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-mini" onClick={() => setzen(frage)} disabled={laeuft}>
              Ja, markieren
            </button>
            <button className="btn-mini" onClick={() => setFrage(null)} disabled={laeuft}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {meldung && (
        <p style={{ fontSize: "12.5px", color: meldung.typ === "ok" ? "var(--green)" : "var(--red)" }}>
          {meldung.typ === "ok" ? "✓" : "✗"} {meldung.text}
        </p>
      )}
    </div>
  );
}
