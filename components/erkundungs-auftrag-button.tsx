"use client";

import { useState } from "react";
import { inZwischenablage } from "@/lib/clipboard";

interface Meldung {
  typ: "ok" | "fehler";
  text: string;
}

export function ErkundungsAuftragButton({ refnr }: { refnr: string }) {
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [manuellerText, setManuellerText] = useState<string | null>(null);

  async function erzeugen() {
    setMeldung(null);
    setManuellerText(null);
    setLaeuft(true);
    try {
      const res = await fetch(`/api/erkundungs-auftrag/${encodeURIComponent(refnr)}`);
      const antwort: { text?: string; url?: string; fehler?: string } = await res
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
      if (antwort.url) {
        window.open(antwort.url, "_blank", "noopener,noreferrer");
      }

      if (kopiert) {
        setMeldung({
          typ: "ok",
          text: "Auftrag kopiert — im Browser-Agent einfügen.",
        });
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
    <div className="space-y-2">
      <button
        onClick={erzeugen}
        disabled={laeuft}
        className="flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-50"
      >
        {laeuft ? "Wird erzeugt …" : "🔍 Erkundungs-Auftrag erzeugen"}
      </button>

      {meldung && (
        <p
          className={`text-sm ${
            meldung.typ === "ok" ? "text-emerald-600" : "text-red-600"
          }`}
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
          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-zinc-700"
        />
      )}
    </div>
  );
}
