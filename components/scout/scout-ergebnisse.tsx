"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  MailX,
  CircleCheckBig,
  X,
  Check,
  ExternalLink,
  FileText,
} from "lucide-react";
import type { EmailVorschlag, ScoutZeile } from "@/lib/stellen";

const toast = (detail: string) =>
  window.dispatchEvent(new CustomEvent("cockpit:toast", { detail }));

function jobUrl(z: ScoutZeile): string {
  return (
    z.externe_url ||
    z.formular_url ||
    `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(z.refnr)}`
  );
}

function provLabel(q: string | null): string {
  switch (q) {
    case "impressum":
      return "aus Impressum";
    case "stellentext":
      return "aus Stellentext";
    case "hauptseite":
      return "von der Hauptseite";
    case "mailto":
      return "aus mailto-Link";
    default:
      return q ? `aus ${q}` : "gefunden";
  }
}

function SrcChip({ quelle }: { quelle: string | null }) {
  if (quelle === "bundesagentur")
    return (
      <span className="src ba">
        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/ba.svg)" }} />
        BA
      </span>
    );
  if (quelle === "adzuna")
    return (
      <span className="src adzuna">
        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/adzuna.svg)" }} />
        Adzuna
      </span>
    );
  if (quelle === "manuell")
    return (
      <span className="src" style={{ background: "var(--muted)", color: "var(--fg-muted)" }}>
        Manuell
      </span>
    );
  return null;
}

type Tab = "all" | "vorschlag" | "keine" | "bestaetigt";

export function ScoutErgebnisse({
  vorschlaege,
  ohneAdresse,
  bestaetigt,
  ohneAdresseGesamt,
  bestaetigtGesamt,
}: {
  vorschlaege: EmailVorschlag[];
  ohneAdresse: ScoutZeile[];
  bestaetigt: ScoutZeile[];
  ohneAdresseGesamt: number; // volle Counts (Listen sind auf 12 gekürzt)
  bestaetigtGesamt: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const gesamt = vorschlaege.length + ohneAdresseGesamt + bestaetigtGesamt;

  // Bestätigen/Verwerfen über die bestehende Route /api/email-vorschlag —
  // identisch zur Dashboard-Sektion „E-Mail-Vorschläge".
  async function vorschlagAktion(refnr: string, aktion: "uebernehmen" | "verwerfen") {
    if (laeuft) return;
    setLaeuft(`${aktion}:${refnr}`);
    try {
      const res = await fetch("/api/email-vorschlag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, refnr }),
      });
      const a: { ok?: boolean; grund?: string } = await res.json().catch(() => ({}));
      if (res.ok && a.ok) {
        toast(aktion === "uebernehmen" ? "Adresse übernommen." : "Vorschlag verworfen.");
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

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "Alle", count: gesamt },
    { key: "vorschlag", label: "Zur Bestätigung", count: vorschlaege.length },
    { key: "keine", label: "Ohne Adresse", count: ohneAdresseGesamt },
    { key: "bestaetigt", label: "Bestätigt", count: bestaetigtGesamt },
  ];
  const zeige = (s: Tab) => tab === "all" || tab === s;
  const weitere = (gesamt: number, gezeigt: number) =>
    gesamt > gezeigt ? (
      <div style={{ padding: "8px 12px 4px", color: "var(--fg-subtle)", fontSize: "12px" }}>
        … und {gesamt - gezeigt} weitere (Liste gekürzt)
      </div>
    ) : null;

  return (
    <div className="res-card">
      <div className="res-head">
        <h2>Ergebnisse</h2>
        <p>· neueste zuerst</p>
      </div>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="tc num">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="res-list">
        {/* ZUR BESTÄTIGUNG (real) */}
        {zeige("vorschlag") &&
          vorschlaege.map((v) => (
            <div className="res" key={`v-${v.refnr}`}>
              <span className="res-ico vorschlag">
                <Mail strokeWidth={2} />
              </span>
              <div className="res-main">
                <div className="res-co">{v.arbeitgeber ?? "Unbekannt"}</div>
                <div className="res-job">{v.titel ?? "Ohne Titel"}</div>
                <div className="res-addr">
                  <span className="addr mono">{v.scout_fund_email}</span>
                  <span className="prov">
                    <FileText strokeWidth={2} />
                    {provLabel(v.scout_fund_quelle)}
                  </span>
                  <SrcChip quelle={v.quelle} />
                </div>
              </div>
              <div className="res-acts">
                <button
                  className="act act-ghost"
                  title="Verwerfen"
                  disabled={laeuft !== null}
                  onClick={() => vorschlagAktion(v.refnr, "verwerfen")}
                >
                  <X strokeWidth={2.4} />
                </button>
                <button
                  className="act act-ok"
                  disabled={laeuft !== null}
                  onClick={() => vorschlagAktion(v.refnr, "uebernehmen")}
                >
                  <Check strokeWidth={3} />
                  Bestätigen
                </button>
              </div>
            </div>
          ))}

        {/* OHNE ADRESSE (real) */}
        {zeige("keine") &&
          ohneAdresse.map((z) => (
            <div className="res" key={`k-${z.refnr}`}>
              <span className="res-ico keine">
                <MailX strokeWidth={2} />
              </span>
              <div className="res-main">
                <div className="res-co">{z.arbeitgeber ?? "Unbekannt"}</div>
                <div className="res-job">{z.titel ?? "Ohne Titel"}</div>
                <div className="res-addr">
                  <span className="addr note">
                    Keine E-Mail gefunden – Bewerbung über Formular/Portal
                  </span>
                  <SrcChip quelle={z.quelle} />
                </div>
              </div>
              <div className="res-acts">
                <a
                  className="act act-ghost"
                  href={jobUrl(z)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink strokeWidth={2} />
                  Im Browser öffnen
                </a>
              </div>
            </div>
          ))}
        {zeige("keine") && weitere(ohneAdresseGesamt, ohneAdresse.length)}

        {/* BESTÄTIGT (real) */}
        {zeige("bestaetigt") &&
          bestaetigt.map((z) => (
            <div className="res" key={`b-${z.refnr}`}>
              <span className="res-ico bestaetigt">
                <CircleCheckBig strokeWidth={2} />
              </span>
              <div className="res-main">
                <div className="res-co">{z.arbeitgeber ?? "Unbekannt"}</div>
                <div className="res-job">{z.titel ?? "Ohne Titel"}</div>
                <div className="res-addr">
                  <span className="addr mono" style={{ color: "var(--fg-muted)" }}>
                    {z.adresse}
                  </span>
                  <SrcChip quelle={z.quelle} />
                </div>
              </div>
              <div className="res-acts">
                <span className="done-badge">
                  <Check strokeWidth={3} />
                  Bestätigt
                </span>
              </div>
            </div>
          ))}
        {zeige("bestaetigt") && weitere(bestaetigtGesamt, bestaetigt.length)}

        {gesamt === 0 && (
          <div style={{ padding: "28px 12px", color: "var(--fg-muted)", fontSize: "13px" }}>
            Noch keine Scout-Ergebnisse.
          </div>
        )}
      </div>
    </div>
  );
}
