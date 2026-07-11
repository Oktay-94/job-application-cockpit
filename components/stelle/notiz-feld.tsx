"use client";

import { useState } from "react";
import { Lock, Save } from "lucide-react";

// Eigene Notiz zur Stelle. Direktes Speichern über /api/notiz (UPDATE notiz).
export function NotizFeld({ refnr, initial }: { refnr: string; initial: string | null }) {
  const [text, setText] = useState(initial ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "fehler">("idle");
  const [meldung, setMeldung] = useState("");

  async function speichern() {
    setStatus("saving");
    setMeldung("");
    try {
      const res = await fetch("/api/notiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refnr, notiz: text }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (a.ok) {
        setStatus("ok");
        setMeldung("Gespeichert.");
      } else {
        setStatus("fehler");
        setMeldung(a.grund ?? "Fehlgeschlagen");
      }
    } catch {
      setStatus("fehler");
      setMeldung("Server nicht erreichbar");
    }
  }

  return (
    <>
      <textarea
        className="notes-area"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        placeholder="Eigene Notizen zu dieser Stelle — z. B. „vor dem Senden anrufen“, Bewerbungsfrist, Ansprechpartner, Gesprächs-Vorbereitung …"
      />
      <div className="notes-foot">
        <span className="notes-hint">
          <Lock strokeWidth={2} />
          Nur für dich sichtbar
        </span>
        {status === "ok" && (
          <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600 }}>{meldung}</span>
        )}
        {status === "fehler" && (
          <span style={{ fontSize: "12px", color: "var(--red)" }}>✗ {meldung}</span>
        )}
        <button className="btn-save" onClick={speichern} disabled={status === "saving"}>
          <Save strokeWidth={2} />
          {status === "saving" ? "Speichere…" : "Speichern"}
        </button>
      </div>
    </>
  );
}
