"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { inZwischenablage } from "@/lib/clipboard";

interface Meldung {
  typ: "ok" | "fehler";
  text: string;
}

export function AgentAuftragButton({
  refnr,
  formularUrl,
}: {
  refnr: string;
  formularUrl: string | null;
}) {
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [manuellerText, setManuellerText] = useState<string | null>(null);

  async function erzeugen() {
    setMeldung(null);
    setManuellerText(null);
    setLaeuft(true);
    try {
      const res = await fetch(`/api/agent-auftrag/${encodeURIComponent(refnr)}`);
      const antwort: { text?: string; fehler?: string } = await res
        .json()
        .catch(() => ({}));

      if (!res.ok || !antwort.text) {
        setMeldung({
          typ: "fehler",
          text: antwort.fehler ?? `Fehlgeschlagen (HTTP ${res.status})`,
        });
        return;
      }

      const kopiert = await inZwischenablage(antwort.text);
      if (formularUrl) {
        window.open(formularUrl, "_blank", "noopener,noreferrer");
      }

      if (kopiert) {
        setMeldung({ typ: "ok", text: "Auftrag kopiert — im Browser-Agent einfügen." });
      } else {
        setManuellerText(antwort.text);
        setMeldung({
          typ: "fehler",
          text: "Zwischenablage nicht verfügbar (HTTP-Verbindung?) — Text unten manuell kopieren.",
        });
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button className="btn btn-primary" onClick={erzeugen} disabled={laeuft}>
        <FileText strokeWidth={2} />
        {laeuft ? "Wird erzeugt …" : "Agent-Auftrag erzeugen"}
      </button>

      {meldung && (
        <p
          style={{
            fontSize: "12.5px",
            color: meldung.typ === "ok" ? "var(--green)" : "var(--red)",
          }}
        >
          {meldung.typ === "ok" ? "✓" : "✗"} {meldung.text}
        </p>
      )}

      {manuellerText && (
        <textarea
          readOnly
          value={manuellerText}
          onFocus={(e) => e.currentTarget.select()}
          rows={10}
          style={{
            width: "100%",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border)",
            background: "var(--muted)",
            padding: "8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "12px",
            color: "var(--fg)",
          }}
        />
      )}
    </div>
  );
}
