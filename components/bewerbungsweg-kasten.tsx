"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErkundungsAuftragButton } from "@/components/erkundungs-auftrag-button";

type Marker = "formular" | "portal" | "tot";

interface Meldung {
  typ: "ok" | "fehler";
  text: string;
}

// Schreibt einen erkundeten Bewerbungskanal über /api/bewerbungsweg fest und
// lädt danach die Server-Seite neu, damit der kanalabhängige Aktionsbereich
// (SENDEN / Formular / Portal …) sofort statt des Erkundungs-Kastens erscheint.
export function BewerbungswegKasten({ refnr }: { refnr: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [formularUrl, setFormularUrl] = useState("");
  const [laeuft, setLaeuft] = useState<"email" | Marker | null>(null);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  // Nach erfolgreichem E-Mail-Speichern: Bündelung läuft im Hintergrund,
  // deshalb statt sofortigem Refresh ein Wartehinweis mit Neu-laden-Knopf.
  const [wartetText, setWartetText] = useState<string | null>(null);

  async function speichern(
    kennung: "email" | Marker,
    body: Record<string, unknown>
  ) {
    setMeldung(null);
    setLaeuft(kennung);
    try {
      const res = await fetch("/api/bewerbungsweg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const antwort: { ok?: boolean; grund?: string; buendelung?: boolean } =
        await res.json().catch(() => ({}));
      if (antwort.ok) {
        if (kennung === "email") {
          // E-Mail gespeichert, Bündelung im Hintergrund angestoßen
          setWartetText(
            antwort.buendelung === false
              ? "E-Mail gespeichert. Die automatische Bündelung konnte nicht ausgelöst werden — Anschreiben/Lebenslauf ggf. manuell anstoßen."
              : "⏳ Anschreiben + Lebenslauf werden erstellt – in ~30 s neu laden."
          );
        } else {
          // Marker: Seite neu rendern → Erkundungs-Kasten weicht dem Aktionsbereich
          router.refresh();
        }
      } else {
        setMeldung({
          typ: "fehler",
          text: antwort.grund ?? `Fehlgeschlagen (HTTP ${res.status})`,
        });
        setLaeuft(null);
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
      setLaeuft(null);
    }
  }

  // Nach erfolgreichem E-Mail-Speichern nur noch der Wartehinweis
  if (wartetText) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-700">✓ {wartetText}</p>
        <button
          onClick={() => router.refresh()}
          className="flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-800"
        >
          Seite neu laden
        </button>
      </div>
    );
  }

  const aktiv = laeuft !== null;
  // Clientseitiger Spiegel der Server-Plausibilität, nur fürs Deaktivieren
  const emailGueltig = /^\S+@\S+\.\S+$/.test(email);

  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-700">
        Bewerbungskanal noch ungeklärt — per Erkundungsauftrag prüfen oder direkt
        festlegen.
      </p>

      <ErkundungsAuftragButton refnr={refnr} />

      {/* E-Mail-Kanal festschreiben */}
      <div className="space-y-2 border-t border-amber-200 pt-3">
        <label className="block text-xs font-medium text-amber-800">
          Bewerbungs-E-Mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="bewerbung@firma.de"
          disabled={aktiv}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => speichern("email", { refnr, kanal: "email", email })}
          disabled={aktiv || !emailGueltig}
          className="flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-50"
        >
          {laeuft === "email" ? "Speichere …" : "E-Mail speichern"}
        </button>
      </div>

      {/* Andere Erkundungs-Ausgänge markieren */}
      <div className="space-y-2 border-t border-amber-200 pt-3">
        <label className="block text-xs font-medium text-amber-800">
          Oder Kanal markieren
        </label>
        <input
          type="url"
          value={formularUrl}
          onChange={(e) => setFormularUrl(e.target.value)}
          placeholder="Formular-URL (für „Als Formular markieren“)"
          disabled={aktiv}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() =>
            speichern("formular", {
              refnr,
              kanal: "formular",
              url: formularUrl,
            })
          }
          disabled={aktiv || formularUrl.trim().length === 0}
          className="flex min-h-11 w-full items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm text-zinc-700 transition-colors hover:border-zinc-400 active:bg-zinc-100 disabled:opacity-50"
        >
          {laeuft === "formular" ? "Speichere …" : "Als Formular markieren"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => speichern("portal", { refnr, kanal: "portal" })}
            disabled={aktiv}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm text-zinc-700 transition-colors hover:border-zinc-400 active:bg-zinc-100 disabled:opacity-50"
          >
            {laeuft === "portal" ? "…" : "Als Portal markieren"}
          </button>
          <button
            onClick={() => speichern("tot", { refnr, kanal: "tot" })}
            disabled={aktiv}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm text-zinc-500 transition-colors hover:border-red-300 hover:text-red-600 active:bg-red-50 disabled:opacity-50"
          >
            {laeuft === "tot" ? "…" : "Als tot markieren"}
          </button>
        </div>
      </div>

      {meldung && (
        <p
          className={`text-sm ${
            meldung.typ === "ok" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {meldung.typ === "ok" ? "✓" : "✗"} {meldung.text}
        </p>
      )}
    </div>
  );
}
