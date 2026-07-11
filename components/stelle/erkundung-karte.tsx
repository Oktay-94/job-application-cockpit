"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Check, X, Save, Loader2, Search, Mail, Plus, Minus } from "lucide-react";
import { inZwischenablage } from "@/lib/clipboard";

type Meldung = { typ: "info" | "fehler"; text: string };

// Erkundungs-Karte der Detailseite. Der Erkundungs-Agent liest die
// Anzeige und legt eine erkundete Beschreibung als VORSCHLAG ab
// (erkundung_vorschlag) — nicht direkt in beschreibung. Hier prüft der Nutzer
// ALT-vs-NEU und übernimmt/verwirft. Re-Erkundung ist auf jeder Stelle möglich.
// Findet die Erkundung eine Bewerbungs-E-Mail, landet sie über
// /api/erkundungs-fund im scout_fund_email-Slot (→ E-Mail-Vorschläge).
export function ErkundungKarte({
  refnr,
  beschreibung,
  vorschlag,
  scoutFundEmail,
}: {
  refnr: string;
  beschreibung: string | null;
  vorschlag: string | null;
  scoutFundEmail: string | null;
}) {
  const router = useRouter();
  // Extras (Beschreibung-Textarea + Speichern + E-Mail-Fund) sind standardmäßig
  // hinter dem "+" versteckt — sichtbar bleibt nur der Erkundungs-Auftrag-Button.
  const [extrasOffen, setExtrasOffen] = useState(false);
  const [text, setText] = useState("");
  const [email, setEmail] = useState(scoutFundEmail ?? "");
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [manuellerAuftrag, setManuellerAuftrag] = useState<string | null>(null);

  const hatBeschreibung = !!beschreibung && beschreibung.trim().length > 0;

  // Bestehende GET-Route wiederverwenden: erzeugt den Erkundungs-Auftragstext,
  // in die Zwischenablage legen + Anzeige im neuen Tab öffnen.
  async function auftragErzeugen() {
    setLaeuft("auftrag");
    setMeldung(null);
    setManuellerAuftrag(null);
    try {
      const res = await fetch(`/api/erkundungs-auftrag/${encodeURIComponent(refnr)}`);
      const a: { text?: string; url?: string; fehler?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !a.text) {
        setMeldung({ typ: "fehler", text: a.fehler ?? `Fehlgeschlagen (HTTP ${res.status})` });
        return;
      }
      const kopiert = await inZwischenablage(a.text);
      if (a.url) window.open(a.url, "_blank", "noopener,noreferrer");
      if (kopiert) {
        setMeldung({ typ: "info", text: "Auftrag kopiert — im Browser-Agent einfügen." });
      } else {
        setManuellerAuftrag(a.text);
        setMeldung({ typ: "fehler", text: "Zwischenablage nicht verfügbar — Auftrag unten manuell kopieren." });
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
    } finally {
      setLaeuft(null);
    }
  }

  async function senden(aktion: "speichern" | "uebernehmen" | "verwerfen") {
    setLaeuft(aktion);
    setMeldung(null);
    try {
      const res = await fetch("/api/erkundung-vorschlag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aktion === "speichern" ? { aktion, refnr, text } : { aktion, refnr }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (res.ok && a.ok) {
        if (aktion === "speichern") setText("");
        const msg =
          aktion === "speichern"
            ? "Vorschlag gespeichert — unten prüfen und übernehmen."
            : aktion === "uebernehmen"
              ? "Übernommen — Beschreibung aktualisiert."
              : "Vorschlag verworfen.";
        setMeldung({ typ: "info", text: msg });
        router.refresh();
      } else {
        setMeldung({ typ: "fehler", text: a.grund ?? `Fehlgeschlagen (HTTP ${res.status})` });
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
    } finally {
      setLaeuft(null);
    }
  }

  // Gefundene Bewerbungs-E-Mail in den scout_fund_email-Slot legen.
  async function fundSenden() {
    setLaeuft("fund");
    setMeldung(null);
    try {
      const res = await fetch("/api/erkundungs-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refnr, email, quelle: "erkundung" }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (res.ok && a.ok) {
        setMeldung({ typ: "info", text: "E-Mail-Fund gespeichert — erscheint bei den E-Mail-Vorschlägen zur Bestätigung." });
        router.refresh();
      } else {
        setMeldung({ typ: "fehler", text: a.grund ?? `Fehlgeschlagen (HTTP ${res.status})` });
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
    } finally {
      setLaeuft(null);
    }
  }

  const busy = laeuft !== null;
  const emailGueltig = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <section className="card">
      <div className="card-head">
        <Compass className="ic" strokeWidth={2} />
        <h2>Erkundung</h2>
      </div>
      <div className="card-body">
        {/* Offener Vorschlag: ALT-vs-NEU + Entscheidung */}
        {vorschlag && (
          <div className="erk-vorschlag">
            <div className="erk-label">
              <Search strokeWidth={2} />
              Beschreibungs-Vorschlag
            </div>
            {hatBeschreibung ? (
              <div className="erk-diff">
                <div className="erk-col">
                  <span className="erk-tag alt">Bisher</span>
                  <div className="erk-text">{beschreibung}</div>
                </div>
                <div className="erk-col">
                  <span className="erk-tag neu">Vorschlag</span>
                  <div className="erk-text">{vorschlag}</div>
                </div>
              </div>
            ) : (
              <div className="erk-text solo">{vorschlag}</div>
            )}
            <div className="erk-acts">
              <button className="btn btn-confirm" disabled={busy} onClick={() => senden("uebernehmen")}>
                {laeuft === "uebernehmen" ? <Loader2 className="spin" strokeWidth={2} /> : <Check strokeWidth={2.4} />}
                {hatBeschreibung ? "Übernehmen (ersetzt)" : "Übernehmen"}
              </button>
              <button className="btn btn-danger-ghost" disabled={busy} onClick={() => senden("verwerfen")}>
                <X strokeWidth={2.2} />
                Verwerfen
              </button>
            </div>
            {hatBeschreibung && (
              <p className="erk-warn">Übernehmen ersetzt die bestehende Beschreibung.</p>
            )}
          </div>
        )}

        {/* Erkunden + speichern — auf jeder Stelle (Re-Erkundung) */}
        <div className="erk-erkunden">
          <p className="erk-hint">
            {hatBeschreibung
              ? "Neu erkunden: Der Agent liest die Anzeige und schlägt eine Beschreibung vor — überschreibt erst nach deiner Bestätigung."
              : "Leere Stelle: erst erkunden lassen, dann greift „Anschreiben + Lebenslauf erzeugen“."}
          </p>
          <button className="btn btn-ghost" disabled={busy} onClick={auftragErzeugen}>
            {laeuft === "auftrag" ? <Loader2 className="spin" strokeWidth={2} /> : <Compass strokeWidth={2} />}
            Erkundungs-Auftrag erzeugen
          </button>
          {manuellerAuftrag && (
            <textarea
              readOnly
              className="erk-area mono"
              value={manuellerAuftrag}
              onFocus={(e) => e.currentTarget.select()}
              rows={6}
            />
          )}

          {/* "+"-Schalter: blendet Textarea + Speichern + E-Mail-Fund ein/aus. */}
          <button
            type="button"
            className="erk-mehr"
            aria-expanded={extrasOffen}
            onClick={() => setExtrasOffen((o) => !o)}
          >
            {extrasOffen ? <Minus strokeWidth={2.4} /> : <Plus strokeWidth={2.4} />}
            {extrasOffen ? "Weniger" : "Beschreibung einfügen · E-Mail-Fund"}
          </button>

          {extrasOffen && (
            <>
              <textarea
                id="erkundung-text"
                data-testid="erkundung-text"
                aria-label="Erkundete Beschreibung"
                className="erk-area"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Erkundete Stellenbeschreibung des Agenten hier einfügen …"
              />
              <button
                id="erkundung-speichern"
                data-testid="erkundung-speichern"
                className="btn btn-primary"
                disabled={busy || text.trim().length === 0}
                onClick={() => senden("speichern")}
              >
                {laeuft === "speichern" ? <Loader2 className="spin" strokeWidth={2} /> : <Save strokeWidth={2} />}
                Als Vorschlag speichern
              </button>

              {/* Gefundene Bewerbungs-E-Mail → scout_fund_email (E-Mail-Vorschläge) */}
              <div className="erk-fund">
            <div className="erk-fund-label">
              <Mail strokeWidth={2} />
              Bewerbungs-E-Mail gefunden?
            </div>
            <input
              id="erkundung-email"
              data-testid="erkundung-email"
              type="email"
              inputMode="email"
              aria-label="Gefundene Bewerbungs-E-Mail"
              className="erk-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bewerbung@firma.de"
            />
            <button
              id="erkundung-fund-speichern"
              data-testid="erkundung-fund-speichern"
              className="btn btn-confirm"
              disabled={busy || !emailGueltig}
              onClick={fundSenden}
            >
              {laeuft === "fund" ? <Loader2 className="spin" strokeWidth={2} /> : <Mail strokeWidth={2} />}
              Als E-Mail-Fund speichern
            </button>
            {scoutFundEmail && (
              <p className="erk-fund-note">
                <Check strokeWidth={2.4} />
                Offener Fund: <b>{scoutFundEmail}</b> — bei „E-Mail-Vorschläge“ bestätigen.
              </p>
            )}
              </div>
            </>
          )}
        </div>

        {meldung && (
          <p
            className="erk-meldung"
            style={{ color: meldung.typ === "fehler" ? "var(--red)" : "var(--fg-muted)" }}
          >
            {meldung.text}
          </p>
        )}
      </div>
    </section>
  );
}
