"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Plus, Check, ChevronRight } from "lucide-react";

type Weg = "email" | "formular" | "portal" | "unklar";
type Status = "idle" | "laeuft" | "ok" | "fehler";

const WEGE: { wert: Weg; label: string }[] = [
  { wert: "email", label: "E-Mail" },
  { wert: "formular", label: "Formular" },
  { wert: "portal", label: "Portal" },
  { wert: "unklar", label: "Unklar" },
];

const istEmail = (s: string) => /\S+@\S+\.\S+/.test(s);

// Dialog "Stelle aufnehmen". Trigger sitzt in der Topbar / mobilen Aktionsleiste
// und öffnet per CustomEvent "cockpit:aufnehmen" (entkoppelt von der Shell).
export function StelleAufnehmen() {
  const router = useRouter();
  const [offen, setOffen] = useState(false);

  const [arbeitgeber, setArbeitgeber] = useState("");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [weg, setWeg] = useState<Weg>("email");
  const [email, setEmail] = useState("");
  const [ort, setOrt] = useState("");
  const [homeoffice, setHomeoffice] = useState(false);
  const [buendeln, setBuendeln] = useState(true);

  const [status, setStatus] = useState<Status>("idle");
  const [meldung, setMeldung] = useState("");
  const [buendelText, setBuendelText] = useState("");
  const [duplikat, setDuplikat] = useState<string | null>(null);

  useEffect(() => {
    const auf = () => setOffen(true);
    window.addEventListener("cockpit:aufnehmen", auf);
    return () => window.removeEventListener("cockpit:aufnehmen", auf);
  }, []);

  useEffect(() => {
    if (!offen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOffen(false);
    };
    document.addEventListener("keydown", esc);
    // Hintergrund-Scroll sperren, solange der Dialog offen ist.
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = vorher;
    };
  }, [offen]);

  function zuruecksetzen() {
    setArbeitgeber("");
    setTitel("");
    setBeschreibung("");
    setWeg("email");
    setEmail("");
    setOrt("");
    setHomeoffice(false);
    setBuendeln(true);
    setStatus("idle");
    setMeldung("");
    setBuendelText("");
    setDuplikat(null);
  }
  function schliessen() {
    setOffen(false);
    zuruecksetzen();
  }

  const bn = beschreibung.trim().length;
  const gueltig =
    arbeitgeber.trim().length > 0 &&
    titel.trim().length > 0 &&
    bn >= 30 &&
    (weg !== "email" || istEmail(email.trim()));

  async function absenden(force: boolean) {
    if (!gueltig) return;
    setStatus("laeuft");
    setMeldung("");
    try {
      const res = await fetch("/api/stelle-aufnehmen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arbeitgeber,
          titel,
          beschreibung,
          kanal: weg,
          kontakt: weg === "email" ? email : null,
          ort: ort.trim() || null,
          homeoffice,
          force,
          buendeln,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setStatus("ok");
        setMeldung(`Aufgenommen: ${body.refnr}`);
        setBuendelText(
          buendeln
            ? body.buendel?.ok
              ? "Anschreiben + Lebenslauf werden erzeugt (~30–60 s) — gleich in der Liste."
              : `Bündel nicht gestartet: ${body.buendel?.grund ?? "unbekannt"} (Stelle ist trotzdem aufgenommen).`
            : ""
        );
        setDuplikat(null);
        router.refresh();
        return;
      }
      if (res.status === 409 && body?.kannForcen) {
        setStatus("idle");
        setDuplikat(body.duplikat ?? "?");
        return;
      }
      setStatus("fehler");
      setMeldung(body?.grund ?? `Fehler (HTTP ${res.status})`);
    } catch {
      setStatus("fehler");
      setMeldung("Server nicht erreichbar");
    }
  }

  if (!offen) return null;

  // Per Portal an document.body: so liegt das Overlay über der GANZEN Seite
  // (inkl. Sidebar + Topbar) und wird nicht von einem Vorfahren in .content
  // eingegrenzt → der Blur frostet alles dahinter.
  return createPortal(
    <div className="overlay" onClick={schliessen}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <h2>Stelle manuell aufnehmen</h2>
            <div className="dh-sub">Wird als Quelle „Manuell“ in deine Pipeline aufgenommen</div>
          </div>
          <button className="dialog-x" onClick={schliessen} aria-label="Schließen">
            <X strokeWidth={2} />
          </button>
        </div>

        {status === "ok" ? (
          <>
            <div className="dialog-body">
              <div
                style={{
                  borderRadius: "var(--r)",
                  border: "1px solid color-mix(in srgb, var(--green) 35%, transparent)",
                  background: "var(--green-weak)",
                  color: "var(--green)",
                  padding: "14px 15px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                }}
              >
                ✓ {meldung}
                <div style={{ fontWeight: 400, marginTop: "6px", color: "var(--fg-muted)" }}>
                  {buendelText ||
                    `Läuft als Quelle „Manuell“ (Status neu) in die Pipeline — wird beim nächsten Nachschub-Lauf automatisch bewertet.`}
                </div>
              </div>
            </div>
            <div className="dialog-foot">
              <button className="btn btn-cancel" onClick={zuruecksetzen}>
                Noch eine aufnehmen
              </button>
              <button className="btn btn-submit" onClick={schliessen}>
                Fertig
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="dialog-body">
              <div className="field">
                <label className="f-label" htmlFor="f-arb">
                  Arbeitgeber<span className="req">*</span>
                </label>
                <input
                  className="input"
                  id="f-arb"
                  value={arbeitgeber}
                  maxLength={200}
                  onChange={(e) => setArbeitgeber(e.target.value)}
                  placeholder="z. B. Musterfirma GmbH"
                />
              </div>

              <div className="field">
                <label className="f-label" htmlFor="f-titel">
                  Titel<span className="req">*</span>
                </label>
                <input
                  className="input"
                  id="f-titel"
                  value={titel}
                  maxLength={300}
                  onChange={(e) => setTitel(e.target.value)}
                  placeholder="z. B. Junior C#/.NET Entwickler (m/w/d)"
                />
              </div>

              <div className="field">
                <label className="f-label" htmlFor="f-besch">
                  Beschreibung<span className="req">*</span>
                  <span className="help">Stellentext einfügen, ≥ 30 Zeichen — das Scoring braucht ihn</span>
                </label>
                <textarea
                  className="input"
                  id="f-besch"
                  value={beschreibung}
                  maxLength={20000}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  placeholder="Aufgaben, Anforderungen, Tech-Stack …"
                />
                <div className={`counter${bn >= 30 ? " ok" : ""}`}>
                  {bn >= 30
                    ? `${bn} Zeichen · genug für das Scoring`
                    : `${bn} Zeichen · noch ${30 - bn} bis zur Mindestlänge`}
                </div>
              </div>

              <div className="field">
                <label className="f-label">Bewerbungsweg</label>
                <div className="seg">
                  {WEGE.map((w) => (
                    <button
                      key={w.wert}
                      className={weg === w.wert ? "active" : ""}
                      onClick={() => setWeg(w.wert)}
                      type="button"
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {weg === "email" && (
                <div className="field">
                  <label className="f-label" htmlFor="f-mail">
                    Bewerbungs-E-Mail<span className="req">*</span>
                  </label>
                  <input
                    className="input"
                    id="f-mail"
                    type="email"
                    value={email}
                    maxLength={200}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bewerbung@firma.de"
                  />
                </div>
              )}

              <div className="row-inline">
                <div className="field">
                  <label className="f-label" htmlFor="f-ort">
                    Ort <span className="help">optional</span>
                  </label>
                  <input
                    className="input"
                    id="f-ort"
                    value={ort}
                    maxLength={200}
                    onChange={(e) => setOrt(e.target.value)}
                    placeholder="z. B. Stuttgart"
                  />
                </div>
                <button
                  type="button"
                  className={`cbox-row${homeoffice ? " on" : ""}`}
                  onClick={() => setHomeoffice((v) => !v)}
                >
                  <span className="cbox">
                    <Check strokeWidth={3} />
                  </span>
                  Homeoffice
                </button>
              </div>

              <button
                type="button"
                className={`gen${buendeln ? " on" : ""}`}
                onClick={() => setBuendeln((v) => !v)}
              >
                <span className="cbox">
                  <Check strokeWidth={3} />
                </span>
                <div className="gen-main">
                  <div className="gen-t">
                    Anschreiben gleich erzeugen
                    <span className="gen-cost num">~4 ct Opus · läuft im Hintergrund</span>
                  </div>
                  <div className="gen-flow">
                    <span className="gen-step">Bewerten</span>
                    <ChevronRight strokeWidth={2.5} />
                    <span className="gen-step">Anschreiben</span>
                    <ChevronRight strokeWidth={2.5} />
                    <span className="gen-step">Lebenslauf</span>
                  </div>
                </div>
              </button>

              {duplikat && (
                <div
                  style={{
                    borderRadius: "var(--r-sm)",
                    border: "1px solid color-mix(in srgb, var(--amber) 40%, transparent)",
                    background: "var(--amber-weak)",
                    color: "var(--amber)",
                    padding: "10px 12px",
                    fontSize: "12.5px",
                  }}
                >
                  Es gibt schon eine Stelle mit gleichem Arbeitgeber + Titel ({duplikat}). Trotzdem aufnehmen?
                </div>
              )}
              {status === "fehler" && (
                <div
                  style={{
                    borderRadius: "var(--r-sm)",
                    border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)",
                    background: "var(--red-weak)",
                    color: "var(--red)",
                    padding: "10px 12px",
                    fontSize: "12.5px",
                  }}
                >
                  ✗ {meldung}
                </div>
              )}
            </div>

            <div className="dialog-foot">
              <button className="btn btn-cancel" onClick={schliessen}>
                Abbrechen
              </button>
              <button
                className="btn btn-submit"
                disabled={!gueltig || status === "laeuft"}
                onClick={() => absenden(duplikat !== null)}
              >
                <Plus strokeWidth={2.2} />
                {status === "laeuft"
                  ? "Nehme auf …"
                  : duplikat
                    ? "Trotzdem aufnehmen"
                    : "Aufnehmen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
