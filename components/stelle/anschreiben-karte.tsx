"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ExternalLink, Info, Sparkles, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import { useAkkordeon } from "./use-akkordeon";

// Nach 202 ("Lauf gestartet") lädt die Seite nach diesem Fenster automatisch
// neu — der Opus-Lauf braucht ~30 s, dann stehen Anschreiben + beide PDFs.
const RELOAD_MS = 30_000;

type Meldung = { typ: "info" | "fehler"; text: string };

// Anschreiben-Karte der Detailseite. Bewusst eine Client-Komponente über die
// ganze Karte (Header + Body), damit EIN State-Owner den Header-Trigger
// ("Neu erzeugen") und den Bestätigungs-/Status-Block im Body teilt.
//
// "Erzeugen" postet an die bestehende /api/aktion ({ aktion:"erzeugen", refnr });
// n8n baut Anschreiben, Lebenslauf-Variante und beide PDFs. Hier reicht der
// Anstoß — nach dem Neuladen zeigt die Seite alles automatisch.
export function AnschreibenKarte({
  refnr,
  anschreiben,
  hatAnschreibenPdf,
  bereitsBeworben,
}: {
  refnr: string;
  anschreiben: string | null;
  hatAnschreibenPdf: boolean;
  bereitsBeworben: boolean;
}) {
  const router = useRouter();
  const hatAnschreiben = !!anschreiben && anschreiben.trim().length > 0;

  // Akkordeon: auf dem Mac offen, wenn ein Anschreiben existiert (Kern-Artefakt);
  // am Handy immer zu.
  const [offen, umschalten] = useAkkordeon(hatAnschreiben, false);
  const [frageOffen, setFrageOffen] = useState(false);
  const [laeuft, setLaeuft] = useState(false); // Request unterwegs
  const [inArbeit, setInArbeit] = useState(false); // Lauf läuft (202/409) bis Reload
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function planeReload() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setInArbeit(false);
      setMeldung(null);
      router.refresh();
    }, RELOAD_MS);
  }

  async function erzeugen() {
    setFrageOffen(false);
    setLaeuft(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/aktion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion: "erzeugen", refnr }),
      });
      // "erzeugen" ist statuscode-basiert: 202 = gestartet, 409 = läuft bereits,
      // alles andere = Fehler. Der Body ist optional (nur Anzeige-Text).
      const a: { grund?: string } = await res.json().catch(() => ({}));

      if (res.status === 202) {
        setInArbeit(true);
        setMeldung({ typ: "info", text: "Anschreiben wird erzeugt … (~30 s, dann neu laden)" });
        planeReload();
      } else if (res.status === 409) {
        setInArbeit(true);
        setMeldung({ typ: "info", text: "Läuft bereits — wird neu geladen, sobald fertig." });
        planeReload();
      } else {
        setMeldung({ typ: "fehler", text: a.grund ?? `Fehlgeschlagen (HTTP ${res.status})` });
      }
    } catch {
      setMeldung({ typ: "fehler", text: "Server nicht erreichbar" });
    }
    setLaeuft(false);
  }

  const gesperrt = laeuft || inArbeit;

  return (
    <section className={`card${offen ? "" : " collapsed"}`}>
      <div
        className="card-head akk-head"
        role="button"
        tabIndex={0}
        aria-expanded={offen}
        onClick={umschalten}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            umschalten();
          }
        }}
      >
        <FileText className="ic" strokeWidth={2} />
        <h2>Anschreiben</h2>
        <div className="akk-right">
          {hatAnschreibenPdf && (
            <a
              className="head-action"
              href={`/api/dokumente/${encodeURIComponent(refnr)}/Anschreiben.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              PDF öffnen
              <ExternalLink strokeWidth={2} />
            </a>
          )}
          {hatAnschreiben && (
            <button
              className="head-action"
              disabled={gesperrt}
              onClick={(e) => {
                e.stopPropagation();
                setFrageOffen(true);
              }}
            >
              {inArbeit ? <Loader2 className="spin" strokeWidth={2} /> : <RefreshCw strokeWidth={2} />}
              Neu erzeugen
            </button>
          )}
          <ChevronDown className="akk-chev" strokeWidth={2.5} />
        </div>
      </div>

      {offen && (
      <div className="card-body">
        {hatAnschreiben ? (
          <div className="letter">{anschreiben}</div>
        ) : (
          <>
            <p style={{ color: "var(--fg-muted)", fontSize: "14px", marginBottom: "14px" }}>
              Noch kein Anschreiben erstellt.
            </p>
            <button className="btn btn-primary" disabled={gesperrt} onClick={() => setFrageOffen(true)}>
              {inArbeit ? <Loader2 className="spin" strokeWidth={2} /> : <Sparkles strokeWidth={2} />}
              Anschreiben + Lebenslauf erzeugen
            </button>
          </>
        )}

        {frageOffen && (
          <div className="weg-note" style={{ flexDirection: "column", gap: "9px", alignItems: "stretch" }}>
            <span>
              {bereitsBeworben
                ? "Du hast dich hier schon beworben — neu erzeugen überschreibt das gesendete Anschreiben. Fortfahren?"
                : "Startet einen Opus-Lauf (~30 s) und erzeugt Anschreiben + Lebenslauf neu."}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn-mini" onClick={erzeugen} disabled={laeuft}>
                Ja, erzeugen
              </button>
              <button className="btn-mini" onClick={() => setFrageOffen(false)} disabled={laeuft}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {meldung && (
          <p
            style={{
              marginTop: "12px",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              color: meldung.typ === "fehler" ? "var(--red)" : "var(--fg-muted)",
            }}
          >
            {inArbeit && meldung.typ === "info" && <Loader2 className="spin" strokeWidth={2} style={{ width: 14, height: 14 }} />}
            {meldung.text}
          </p>
        )}

        <div className="letter-foot">
          <Info strokeWidth={2} />
          Vorschau aus der Datenbank — maßgeblich ist das PDF, das mitgesendet wird.
        </div>
      </div>
      )}
    </section>
  );
}
