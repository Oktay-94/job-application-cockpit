"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Send,
  Mail,
  Globe,
  FileText,
  CircleHelp,
  CircleSlash,
  MapPin,
  Check,
  AlertTriangle,
  Trash2,
  X,
  Paperclip,
  FolderOpen,
  Users,
  Building2,
  Clock,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import type { VersandfertigDetail } from "@/lib/stellen";
import {
  bewerbungsweg,
  WEG_FARBE,
  WEG_LABEL,
  parseArbeitsgebiet,
  ARBEITSGEBIET_ICON,
  ARBEITSGEBIET_LABEL,
} from "@/lib/stellen-filter";
import { AgentAuftragButton } from "@/components/agent-auftrag-button";
import { stellenUrl } from "@/lib/stellen-url";

type VersandfertigZeile = VersandfertigDetail & {
  ordnerOk: boolean;
  frische: string | null;
};

const toast = (detail: string) =>
  window.dispatchEvent(new CustomEvent("cockpit:toast", { detail }));

// Farbiges Versandweg-Symbol — gleiche Farb-/Icon-Logik wie die Stellen-Tabelle.
const WEG_ICON: Record<string, typeof Mail> = {
  email: Mail,
  portal: Globe,
  formular: FileText,
  ungeklaert: CircleHelp,
  tot: CircleSlash,
};
function wegTint(farbe: string) {
  return { color: farbe, background: `color-mix(in srgb, ${farbe} 16%, transparent)` };
}

function scoreKlasse(score: number | null): "hi" | "mid" {
  return score !== null && score >= 85 ? "hi" : "mid";
}

function cvInfo(richtung: string | null): { cls: string; text: string } {
  return richtung === "entwicklung"
    ? { cls: "va", text: "CV Entwicklung" }
    : { cls: "vb", text: "CV Sysadmin" };
}

interface KanalInfo {
  istMail: boolean;
  title: string;
  addr: string;
  ok: boolean;
}
function kanalInfo(s: VersandfertigDetail): KanalInfo {
  if (s.bewerbungskanal === "email")
    return {
      istMail: true,
      title: "Per E-Mail",
      addr: s.bewerbung_email ?? "— keine Adresse hinterlegt",
      ok: !!s.bewerbung_email,
    };
  // Nicht-E-Mail: addr ist die (immer vorhandene) Quell-URL statt eines toten "—".
  if (s.bewerbungskanal === "portal")
    return { istMail: false, title: "Per Portal", addr: stellenUrl(s), ok: false };
  if (s.bewerbungskanal === "formular")
    return { istMail: false, title: "Per Online-Formular", addr: stellenUrl(s), ok: false };
  return { istMail: false, title: "Bewerbungsweg ungeklärt", addr: stellenUrl(s), ok: false };
}

function QuelleChip({ quelle }: { quelle: string | null }) {
  if (quelle === "bundesagentur")
    return (
      <span className="chip ba">
        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/ba.svg)" }} />
        Arbeitsagentur
      </span>
    );
  if (quelle === "adzuna")
    return (
      <span className="chip adzuna">
        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/adzuna.svg)" }} />
        Adzuna
      </span>
    );
  return <span className="chip">Manuell</span>;
}

export function VersandfertigClient({ stellen }: { stellen: VersandfertigZeile[] }) {
  // Akkordeon: offen = Index der aufgeklappten Zeile (null = alle zu). Das
  // Detail-Panel rendert INLINE als Kind der offenen Zeile — nicht mehr als
  // separate Spalte, die mobil ans Seitenende rutscht.
  const [offen, setOffen] = useState<number | null>(null);
  const [gateOffen, setGateOffen] = useState(false);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "done" | "fehler">("idle");
  const [verwerfenFrage, setVerwerfenFrage] = useState(false);
  const [verwerfenLaeuft, setVerwerfenLaeuft] = useState(false);
  const [erledigtLaeuft, setErledigtLaeuft] = useState(false);
  const [restampLaeuft, setRestampLaeuft] = useState(false);
  const [restampDatum, setRestampDatum] = useState<string | null>(null);
  const router = useRouter();

  // Die offene (= handelnde) Stelle; Gate und Versand beziehen sich auf sie.
  const s = offen != null ? stellen[offen] : null;

  // Deep-Link: ?refnr=<x> (z. B. aus "In Versandfertig öffnen") klappt genau
  // diese Stelle auf und scrollt sie in Sicht. window.location statt
  // useSearchParams → reiner Client-Effekt beim Mount, kein Suspense/Prerender-
  // Sonderfall. Unbekannter/leerer Param → wie bisher, nichts aufgeklappt.
  useEffect(() => {
    const refnr = new URLSearchParams(window.location.search).get("refnr");
    if (!refnr) return;
    const idx = stellen.findIndex((z) => z.refnr === refnr);
    if (idx < 0) return;
    setOffen(idx);
    // erst nach dem Aufklapp-Render in den sichtbaren Bereich holen
    requestAnimationFrame(() => {
      document
        .getElementById(`vf-${refnr}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [stellen]);

  // Body-Scroll-Lock + Esc, solange das Gate offen ist.
  useEffect(() => {
    if (!gateOffen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGateOffen(false);
    };
    document.addEventListener("keydown", esc);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = vorher;
    };
  }, [gateOffen]);

  if (stellen.length === 0) {
    return <div className="vf-empty">Gerade nichts versandfertig.</div>;
  }

  const beide = c1 && c2;

  const oeffneGate = () => {
    setC1(false);
    setC2(false);
    setSendStatus("idle");
    setGateOffen(true);
  };

  // Verwerfen: Stelle aus der Queue nehmen → status=aussortiert (umkehrbar).
  // /api/status mappt "verwerfen" → aussortiert; danach Liste neu laden, die
  // Zeile verschwindet, Akkordeon zu.
  async function verwerfen(refnr: string) {
    if (verwerfenLaeuft) return;
    setVerwerfenLaeuft(true);
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ziel: "verwerfen", refnr }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (res.ok && a.ok) {
        toast("Verworfen — Stelle aussortiert (umkehrbar).");
        setVerwerfenFrage(false);
        setOffen(null);
        router.refresh();
      } else {
        toast(`Verwerfen: ${a.grund ?? `Fehlgeschlagen (HTTP ${res.status})`}`);
      }
    } catch {
      toast("Server nicht erreichbar.");
    } finally {
      setVerwerfenLaeuft(false);
    }
  }

  // Portal/Formular: kein Mailversand. "Als beworben markieren" meldet die
  // selbst erledigte Bewerbung über die BESTEHENDE Route /api/aktion (erledigt).
  async function erledigen(refnr: string) {
    if (erledigtLaeuft) return;
    setErledigtLaeuft(true);
    try {
      const res = await fetch("/api/aktion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion: "erledigt", refnr }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (res.ok && a.ok) {
        toast("Als beworben markiert.");
        setOffen(null);
        router.refresh();
      } else {
        toast(`Markieren: ${a.grund ?? `Fehlgeschlagen (HTTP ${res.status})`}`);
      }
    } catch {
      toast("Server nicht erreichbar.");
    } finally {
      setErledigtLaeuft(false);
    }
  }

  // Scharfer Versand: ruft die BESTEHENDE Route /api/aktion (→ n8n). n8n bleibt
  // im Testmodus (Mail an das eigene Postfach des Bewerbers). Erst nach beiden Haken aktiv.
  async function senden() {
    if (!s || !beide || sendStatus === "sending") return;
    setSendStatus("sending");
    try {
      const res = await fetch("/api/aktion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion: "senden", refnr: s.refnr }),
      });
      const a: { ok?: boolean; grund?: string; testmodus?: boolean } = await res
        .json()
        .catch(() => ({}));
      if (a.ok) {
        setSendStatus("done");
        toast(
          a.testmodus
            ? "Versand ausgelöst (Testmodus — Mail ging an dein eigenes Postfach)."
            : "Versand ausgelöst."
        );
        // Erfolg: Zeile aus der Queue nehmen, sobald n8n den DB-Status asynchron
        // gesetzt hat (anschreiben_erstellt → versendet/unzustellbar). Statt
        // fester Wartezeit gegen /api/stelle-status pollen — so verschwindet die
        // Zeile weder zu früh (Status noch alt) noch unnötig spät. Obergrenze
        // 8×1500 ms (~12 s); danach Fallback-Refresh, damit die UI nicht hängt.
        // setOffen(null) erst am Ende → das Gate zeigt solange seine "done"-Ansicht.
        for (let versuch = 0; versuch < 8; versuch++) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          try {
            const p = await fetch(`/api/stelle-status/${encodeURIComponent(s.refnr)}`);
            const d: { status?: string | null } = await p.json().catch(() => ({}));
            if (p.ok && d.status !== "anschreiben_erstellt") break;
          } catch {
            // Status-Abruf fehlgeschlagen — nicht abbrechen, nächster Versuch.
          }
        }
        setOffen(null);
        router.refresh();
      } else {
        setSendStatus("fehler");
        toast(`Versand: ${a.grund ?? "Fehlgeschlagen"}`);
      }
    } catch {
      setSendStatus("fehler");
      toast("Server nicht erreichbar.");
    }
  }

  // Restamp: Datumszeile im Anschreiben-PDF auf heute setzen (→ n8n-Workflow
  // Cockpit-Restamp). Inhalt bleibt eingefroren, nur das Datum wird neu gestempelt.
  async function restampen(refnr: string) {
    if (restampLaeuft) return;
    setRestampLaeuft(true);
    setRestampDatum(null);
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
        setRestampDatum(a.datum);
        toast(`Anschreiben-PDF aktualisiert — Datum: ${a.datum}.`);
      } else {
        toast(`PDF aktualisieren: ${a.grund ?? `Fehlgeschlagen (HTTP ${res.status})`}`);
      }
    } catch {
      toast("Server nicht erreichbar.");
    } finally {
      setRestampLaeuft(false);
    }
  }

  async function ordnerOeffnen(stelle: VersandfertigZeile) {
    if (!stelle.ordnerOk) return;
    try {
      // Bestehende Doku-Route: refnr in der URL, Pfad wird serverseitig aufgelöst.
      const res = await fetch(`/api/dokumente/${encodeURIComponent(stelle.refnr)}/finder`, {
        method: "POST",
      });
      const a: { ok?: boolean; fehler?: string } = await res.json().catch(() => ({}));
      toast(res.ok && a.ok ? "Ordner im Finder geöffnet." : `Ordner: ${a.fehler ?? "Fehler"}`);
    } catch {
      toast("Server nicht erreichbar.");
    }
  }

  // Inline-Detailpanel einer Zeile (Akkordeon-Inhalt). Alle Werte aus der
  // übergebenen Stelle — so kann jede offene Zeile ihr eigenes Panel rendern.
  const renderDetail = (stelle: VersandfertigZeile) => {
    const kanal = kanalInfo(stelle);
    const cv = cvInfo(stelle.score_richtung);
    const weg = bewerbungsweg(stelle.bewerbungskanal);
    const KanalIcon = WEG_ICON[weg];
    const wegFarbe = WEG_FARBE[weg];
    // Das ECHTE, mitgesendete Anschreiben (aus der n8n-Pipeline), inline geliefert
    // über die bestehende Doku-Route. Nur wenn der Ordner auflösbar ist.
    const pdfUrl = stelle.ordnerOk
      ? `/api/dokumente/${encodeURIComponent(stelle.refnr)}/Anschreiben.pdf`
      : null;
    const s = stelle;
    return (
        <div className="detail">
          <div className="d-head">
            <div className={`d-score ${scoreKlasse(s.score)} num`}>{s.score ?? "—"}</div>
            <div className="d-htext">
              <div className="d-co">{s.arbeitgeber ?? "Unbekannt"}</div>
              <div className="d-role">{s.titel ?? "Ohne Titel"}</div>
              <div className="d-chips">
                <QuelleChip quelle={s.quelle} />
                <span className={`chip ${cv.cls}`}>{cv.text}</span>
                {s.ort && (
                  <span className="chip loc">
                    <MapPin strokeWidth={2} />
                    {s.ort}
                  </span>
                )}
                {/* Arbeitgeber-Art (gleiche Logik wie der Stellen-Filter: vermittler = ist_vermittler === true) */}
                {s.ist_vermittler === true ? (
                  <span className="chip" style={wegTint("#e3811b")}>
                    <Users strokeWidth={2} />
                    Vermittler
                  </span>
                ) : (
                  <span className="chip" style={wegTint("#1d9d52")}>
                    <Building2 strokeWidth={2} />
                    Direktarbeitgeber
                  </span>
                )}
                {/* Frische der Anzeige — oder Arbeitsgebiet, falls kein Datum */}
                {s.frische ? (
                  <span className="chip">
                    <Clock strokeWidth={2} />
                    {s.frische}
                  </span>
                ) : (
                  <span className="chip">
                    <span
                      className="asset-ico"
                      style={{
                        backgroundImage: `url(${ARBEITSGEBIET_ICON[parseArbeitsgebiet(s.arbeitsgebiet)]})`,
                        width: 13,
                        height: 13,
                        flex: "0 0 13px",
                      }}
                    />
                    {ARBEITSGEBIET_LABEL[parseArbeitsgebiet(s.arbeitsgebiet)]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Versandweg */}
          <div className="d-section">
            <div className="d-label">
              <Send strokeWidth={2} />
              Versandweg
            </div>
            <div className="channel">
              <span className="channel-ico" style={wegTint(wegFarbe)}>
                <KanalIcon strokeWidth={2} />
              </span>
              <div className="channel-main">
                <div className="channel-t">{kanal.title}</div>
                {kanal.istMail ? (
                  // E-Mail: addr ist die Versand-Adresse (Text) — Quell-Link liegt als
                  // Button in der Aktionsleiste (gleiche Optik wie Portal/Formular).
                  <div className="channel-addr">{kanal.addr}</div>
                ) : (
                  // Nicht-E-Mail: addr IST die Quell-URL → direkt klickbar.
                  <a
                    className="channel-addr"
                    href={stellenUrl(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {kanal.addr}
                  </a>
                )}
              </div>
              {kanal.ok && (
                <span className="channel-ok">
                  <Check strokeWidth={3} />
                  Adresse hinterlegt
                </span>
              )}
            </div>
          </div>

          {/* Anschreiben */}
          <div className="d-section">
            <div className="d-label">
              <FileText strokeWidth={2} />
              Anschreiben
            </div>
            {s.anschreiben && s.anschreiben.trim().length > 0 ? (
              <div className="letter" style={{ whiteSpace: "pre-wrap" }}>
                {s.anschreiben}
              </div>
            ) : (
              <div className="letter platzhalter">Vorschau folgt — noch kein Anschreiben hinterlegt.</div>
            )}
            <div className="letter-foot">
              {pdfUrl ? (
                <a className="btn btn-ghost btn-sm" href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText strokeWidth={2} />
                  Anschreiben (PDF) öffnen
                </a>
              ) : (
                <button className="btn btn-ghost btn-sm" disabled title="Kein PDF gefunden">
                  <FileText strokeWidth={2} />
                  PDF nicht gefunden
                </button>
              )}
              {stelle.ordnerOk && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => restampen(stelle.refnr)}
                  disabled={restampLaeuft}
                  title="Datumszeile im Anschreiben-PDF auf heute setzen"
                >
                  <RefreshCw strokeWidth={2} />
                  {restampLaeuft ? "aktualisiere…" : "PDF aktualisieren"}
                </button>
              )}
              {restampDatum && (
                <span style={{ fontSize: "12.5px", color: "var(--green)" }}>
                  Datum: {restampDatum} ✓
                </span>
              )}
              <span className="lf-note">Vorschau — maßgeblich ist das mitgesendete PDF</span>
            </div>
          </div>

          {/* Anhänge */}
          <div className="d-section">
            <div className="d-label">
              <Paperclip strokeWidth={2} />
              Anhänge
            </div>
            <div className="atts">
              <div className="att">
                <span className="att-ico">
                  <FileText strokeWidth={2} />
                </span>
                <div>
                  <div className="att-t">Anschreiben.pdf</div>
                  <div className="att-s">wird mitgesendet</div>
                </div>
              </div>
              <div className="att">
                <span className="att-ico">
                  <FileText strokeWidth={2} />
                </span>
                <div>
                  <div className="att-t">
                    Lebenslauf · {cv.text === "CV Entwicklung" ? "Variante A" : "Variante B"}
                  </div>
                  <div className="att-s">wird mitgesendet</div>
                </div>
              </div>
              <div className="att">
                <span className="att-ico">
                  <FileText strokeWidth={2} />
                </span>
                <div>
                  <div className="att-t">Zeugnisse_Max_Mustermann.pdf</div>
                  <div className="att-s">wird mitgesendet</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => ordnerOeffnen(stelle)}
                disabled={!stelle.ordnerOk}
                title={stelle.ordnerOk ? "Firmen-Ordner im Finder öffnen" : "Kein Ordner gefunden"}
              >
                <FolderOpen strokeWidth={2} />
                Ordner öffnen
              </button>
            </div>
          </div>

          {/* Aktionen — pro Kanal verzweigt. Scharfer Mailversand (Gate →
              /api/aktion senden) NUR bei email mit Adresse; Portal/Formular
              erledigt der Nutzer selbst und meldet via /api/aktion erledigt. */}
          <div className="sendbar">
            <div className="send-hint">
              {weg === "email" && kanal.ok ? (
                <>
                  <b>Einmal gesendet ist endgültig</b> — vor dem Versand kommt der Sicherheits-Check.
                </>
              ) : weg === "email" ? (
                <span style={{ color: "var(--red)" }}>
                  Kanal E-Mail, aber <b>keine Bewerbungs-E-Mail hinterlegt</b> — Adresse auf der Stelle
                  nachtragen, dann senden.
                </span>
              ) : weg === "portal" ? (
                <>
                  Portal-Bewerbung — <b>kein Mailversand</b>. Im Portal bewerben, danach als beworben
                  markieren.
                </>
              ) : weg === "formular" ? (
                <>
                  Online-Formular — Agent-Auftrag erzeugen, ausfüllen &amp; selbst absenden, danach als
                  beworben markieren.
                </>
              ) : (
                <>Bewerbungsweg ungeklärt — erst den Kanal auf der Stelle klären.</>
              )}
            </div>

            <button
              className="btn btn-ghost"
              disabled={verwerfenLaeuft}
              onClick={() => setVerwerfenFrage(true)}
            >
              <Trash2 strokeWidth={2} />
              Verwerfen
            </button>

            {/* Portal: Portal-Link (immer da, quelle-bewusst) + Selbstmeldung, kein Senden */}
            {weg === "portal" && (
              <>
                <a
                  className="btn btn-ghost"
                  href={stellenUrl(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe strokeWidth={2} />
                  Im Portal bewerben ↗
                </a>
                <button
                  className="btn btn-confirm"
                  disabled={erledigtLaeuft}
                  onClick={() => erledigen(s.refnr)}
                >
                  <Check strokeWidth={2} />
                  Als beworben markieren
                </button>
              </>
            )}

            {/* Formular: Agent-Auftrag + Formular-Link (immer da) + Selbstmeldung */}
            {weg === "formular" && (
              <>
                <AgentAuftragButton refnr={s.refnr} formularUrl={s.formular_url ?? s.externe_url} />
                <a
                  className="btn btn-ghost"
                  href={stellenUrl(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText strokeWidth={2} />
                  Formular öffnen ↗
                </a>
                <button
                  className="btn btn-confirm"
                  disabled={erledigtLaeuft}
                  onClick={() => erledigen(s.refnr)}
                >
                  <Check strokeWidth={2} />
                  Als beworben markieren
                </button>
              </>
            )}

            {/* Ungeklärt/tot: kein Senden — aber trotzdem ein klickbarer Quell-Link. */}
            {(weg === "ungeklaert" || weg === "tot") && (
              <a
                className="btn btn-ghost"
                href={stellenUrl(s)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe strokeWidth={2} />
                Anzeige öffnen ↗
              </a>
            )}

            {/* E-Mail: Quell-Link als Button — Optik wie "Im Portal bewerben" */}
            {weg === "email" && (
              <a
                className="btn btn-ghost"
                href={stellenUrl(s)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe strokeWidth={2} />
                Anzeige öffnen ↗
              </a>
            )}
            {/* E-Mail mit Adresse: bestehendes Sicherheits-Gate, unverändert */}
            {weg === "email" && kanal.ok && (
              <button className="btn btn-send" onClick={oeffneGate}>
                <Send strokeWidth={2} />
                Jetzt senden
              </button>
            )}
          </div>

          {verwerfenFrage && (
            <div
              style={{
                marginTop: "10px",
                padding: "12px",
                borderRadius: "var(--r-sm)",
                background: "var(--amber-weak)",
                border: "1px solid color-mix(in srgb, var(--amber) 30%, transparent)",
                display: "flex",
                flexDirection: "column",
                gap: "9px",
                fontSize: "13px",
              }}
            >
              <span>
                Stelle aus der Warteschlange nehmen? Sie wird <b>aussortiert</b> (umkehrbar) und nicht
                gesendet.
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={verwerfenLaeuft}
                  onClick={() => verwerfen(stelle.refnr)}
                >
                  {verwerfenLaeuft ? "…" : "Ja, verwerfen"}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={verwerfenLaeuft}
                  onClick={() => setVerwerfenFrage(false)}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
    );
  };

  // Gate (Stolperstein-42-Check) — gebunden an die übergebene (= offene) Stelle.
  const renderGate = (stelle: VersandfertigZeile) => {
    const kanal = kanalInfo(stelle);
    const pdfUrl = stelle.ordnerOk
      ? `/api/dokumente/${encodeURIComponent(stelle.refnr)}/Anschreiben.pdf`
      : null;
    const s = stelle;
    return createPortal(
          <div className="overlay" onClick={() => setGateOffen(false)}>
            <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-head">
                <div>
                  <h2>Vor dem Senden prüfen</h2>
                  <div className="dh-sub">
                    {s.arbeitgeber} · {kanal.title}
                  </div>
                </div>
                <button className="dialog-x" onClick={() => setGateOffen(false)} aria-label="Schließen">
                  <X strokeWidth={2} />
                </button>
              </div>

              <div className="dialog-body">
                <div className="precheck">
                  <div className="pc-warn">
                    <span className="tri">
                      <AlertTriangle strokeWidth={2} />
                    </span>
                    <span>
                      <b>Einmaliger Versand.</b> Einmal gesendet ist endgültig — eine Bewerbung pro
                      Firma, kein Zurück. Bestätige beide Punkte, dann wird „Jetzt senden“ aktiv.
                    </span>
                  </div>
                  <div className="pc-list">
                    <button className={`pc-item${c1 ? " on" : ""}`} onClick={() => setC1((v) => !v)}>
                      <span className="pc-box">
                        <Check strokeWidth={3} />
                      </span>
                      <div className="pc-txt">
                        <div className="pc-t">
                          Stelle ist noch aktiv
                          <a
                            className="recheck"
                            href={stellenUrl(s)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            erneut prüfen ↗
                          </a>
                        </div>
                        <div className="pc-s">Anzeige in der Quelle öffnen und kurz gegenprüfen</div>
                      </div>
                    </button>
                    <button className={`pc-item${c2 ? " on" : ""}`} onClick={() => setC2((v) => !v)}>
                      <span className="pc-box">
                        <Check strokeWidth={3} />
                      </span>
                      <div className="pc-txt">
                        <div className="pc-t">
                          Anschreiben final gelesen
                          {pdfUrl && (
                            <a
                              className="recheck"
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              PDF öffnen ↗
                            </a>
                          )}
                        </div>
                        <div className="pc-s">
                          Das echte, mitgesendete PDF lesen — Firma, Anrede und Stellentitel stimmen
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="sendbar" style={{ borderRadius: 0 }}>
                {sendStatus === "done" ? (
                  <>
                    <span className="sent-ok" style={{ display: "inline-flex" }}>
                      <Check strokeWidth={2.5} />
                      Versand ausgelöst
                    </span>
                    <button className="btn btn-ghost" onClick={() => setGateOffen(false)}>
                      Schließen
                    </button>
                  </>
                ) : (
                  <>
                    <div className="send-hint">
                      {beide ? (
                        <>
                          Alles geprüft — Versand an <b>{kanal.addr}</b>.
                        </>
                      ) : (
                        <>
                          Bitte zuerst <b>beide Punkte</b> bestätigen.
                        </>
                      )}
                    </div>
                    <button className="btn btn-ghost" onClick={() => setGateOffen(false)}>
                      Abbrechen
                    </button>
                    <button
                      className="btn btn-send"
                      disabled={!beide || sendStatus === "sending"}
                      onClick={senden}
                    >
                      <Send strokeWidth={2} />
                      {sendStatus === "sending" ? "Sende…" : "Jetzt senden"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
      document.body
    );
  };

  return (
    <>
      <div className="vf-accordion">
        <div className="q-head">Warteschlange</div>
        {stellen.map((z, i) => {
          const zw = bewerbungsweg(z.bewerbungskanal);
          const ZIcon = WEG_ICON[zw];
          const istOffen = i === offen;
          return (
            <div className={`vf-row${istOffen ? " open" : ""}`} key={z.refnr} id={`vf-${z.refnr}`}>
              <button
                className={`q-item${istOffen ? " active" : ""}`}
                onClick={() => {
                  setVerwerfenFrage(false);
                  setRestampDatum(null);
                  setOffen(istOffen ? null : i);
                }}
                aria-expanded={istOffen}
              >
                <div className={`q-score ${scoreKlasse(z.score)} num`}>{z.score ?? "—"}</div>
                <div className="q-main">
                  <div className="q-co">{z.arbeitgeber ?? "Unbekannt"}</div>
                  <div className="q-role">{z.titel ?? "Ohne Titel"}</div>
                </div>
                <span
                  className="q-chan"
                  style={wegTint(WEG_FARBE[zw])}
                  title={`Versand: ${WEG_LABEL[zw]}`}
                >
                  <ZIcon strokeWidth={2} />
                </span>
                <ChevronDown className="q-caret" strokeWidth={2.5} />
              </button>
              {istOffen && renderDetail(z)}
            </div>
          );
        })}
      </div>

      {gateOffen && s && renderGate(s)}
    </>
  );
}
