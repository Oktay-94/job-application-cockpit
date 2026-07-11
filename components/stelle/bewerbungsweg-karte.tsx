"use client";

import { useState } from "react";
import { Mail, Globe, FileText, CircleHelp, Pencil, Info, ListChecks } from "lucide-react";
import { BewerbungswegKasten } from "@/components/bewerbungsweg-kasten";
import { bewerbungsweg, WEG_FARBE, WEG_LABEL } from "@/lib/stellen-filter";

const WEG_ICON: Record<string, typeof Mail> = {
  email: Mail,
  portal: Globe,
  formular: FileText,
  ungeklaert: CircleHelp,
  tot: CircleHelp,
};

export function BewerbungswegKarte({
  refnr,
  kanal,
  bewerbungEmail,
  formularUrl,
  externeUrl,
  anzeigeUrl,
}: {
  refnr: string;
  kanal: string | null;
  bewerbungEmail: string | null;
  formularUrl: string | null;
  externeUrl: string | null;
  anzeigeUrl: string;
}) {
  const [aendern, setAendern] = useState(false);
  const weg = bewerbungsweg(kanal);
  const Icon = WEG_ICON[weg];
  const farbe = WEG_FARBE[weg];
  const adresse =
    weg === "email"
      ? bewerbungEmail
      : weg === "formular"
        ? formularUrl ?? externeUrl
        : weg === "portal"
          ? externeUrl
          : null;

  return (
    <section className="card">
      <div className="card-head">
        <ListChecks className="ic" strokeWidth={2} />
        <h2>Bewerbungsweg</h2>
        <button className="head-action" onClick={() => setAendern((v) => !v)}>
          <Pencil strokeWidth={2} />
          {aendern ? "Schließen" : "Ändern"}
        </button>
      </div>
      <div className="card-body">
        <div className="weg-channel">
          <span className="weg-ic" style={{ color: farbe, background: `color-mix(in srgb, ${farbe} 16%, transparent)` }}>
            <Icon strokeWidth={2} />
          </span>
          Per {WEG_LABEL[weg]}
        </div>
        <div className="weg-addr">
          <Icon strokeWidth={2} />
          {adresse ?? "— keine Adresse/URL hinterlegt"}
        </div>
        {/* E-Mail: addr ist nur die Versand-Adresse → eigener Quell-Link zur Anzeige */}
        {weg === "email" && (
          <a
            className="btn btn-ghost"
            style={{ marginTop: 8 }}
            href={anzeigeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Globe strokeWidth={2} />
            Anzeige öffnen ↗
          </a>
        )}

        {aendern ? (
          <div style={{ marginTop: "12px" }}>
            <BewerbungswegKasten refnr={refnr} />
          </div>
        ) : (
          <div className="weg-note">
            <Info strokeWidth={2} />
            Automatisch aus der Anzeige erkannt. Stimmt die Adresse nicht, über „Ändern“ korrigieren oder per Scout suchen — sonst läuft die Bewerbung ins Leere.
          </div>
        )}
      </div>
    </section>
  );
}
