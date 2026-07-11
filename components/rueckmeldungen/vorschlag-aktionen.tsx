"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

const toast = (detail: string) =>
  window.dispatchEvent(new CustomEvent("cockpit:toast", { detail }));

// Scharfe Übernehmen/Verwerfen-Knöpfe für einen Fuzzy-Rückmeldungs-Vorschlag.
// Übernehmen schreibt den Vorschlag in die echten rueckmeldung*-Spalten,
// Verwerfen löscht ihn — beides über /api/rueckmeldung-vorschlag.
export function VorschlagAktionen({
  refnr,
  firma,
  modus = "beide",
}: {
  refnr: string;
  firma: string;
  modus?: "beide" | "gesehen";
}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState<"uebernehmen" | "verwerfen" | null>(null);

  async function ausfuehren(aktion: "uebernehmen" | "verwerfen") {
    if (laeuft) return;
    setLaeuft(aktion);
    try {
      const res = await fetch("/api/rueckmeldung-vorschlag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, refnr }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (res.ok && a.ok) {
        toast(
          aktion === "uebernehmen"
            ? `Übernommen: ${firma} ist jetzt in den Rückmeldungen.`
            : `Verworfen: Vorschlag zu ${firma} entfernt.`
        );
        router.refresh();
      } else {
        toast(`Fehlgeschlagen: ${a.grund ?? `HTTP ${res.status}`}`);
        setLaeuft(null);
      }
    } catch {
      toast("Server nicht erreichbar.");
      setLaeuft(null);
    }
  }

  if (modus === "gesehen") {
    return (
      <div className="acts">
        <button
          className="abtn abtn-ok"
          disabled={laeuft !== null}
          onClick={() => ausfuehren("uebernehmen")}
        >
          <Check strokeWidth={2.6} />
          {laeuft === "uebernehmen" ? "…" : "Gesehen"}
        </button>
      </div>
    );
  }

  return (
    <div className="acts">
      <button
        className="abtn abtn-ok"
        disabled={laeuft !== null}
        onClick={() => ausfuehren("uebernehmen")}
      >
        <Check strokeWidth={2.6} />
        {laeuft === "uebernehmen" ? "…" : "Übernehmen"}
      </button>
      <button
        className="abtn abtn-no"
        disabled={laeuft !== null}
        onClick={() => ausfuehren("verwerfen")}
      >
        <X strokeWidth={2.4} />
        Verwerfen
      </button>
    </div>
  );
}
