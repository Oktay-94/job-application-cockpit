"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Check, X } from "lucide-react";
import type { EmailVorschlag } from "@/lib/stellen";

type Aktion = "uebernehmen" | "verwerfen";

function MailZeile({ vorschlag }: { vorschlag: EmailVorschlag }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState<Aktion | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function ausfuehren(aktion: Aktion) {
    setFehler(null);
    setLaeuft(aktion);
    try {
      const res = await fetch("/api/email-vorschlag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, refnr: vorschlag.refnr }),
      });
      const antwort: { ok?: boolean; grund?: string } = await res
        .json()
        .catch(() => ({}));
      if (antwort.ok) {
        router.refresh(); // Zeile verschwindet nach Neuladen der Server-Daten
      } else {
        setFehler(antwort.grund ?? `Fehlgeschlagen (HTTP ${res.status})`);
        setLaeuft(null);
      }
    } catch {
      setFehler("Server nicht erreichbar");
      setLaeuft(null);
    }
  }

  const aktiv = laeuft !== null;

  return (
    <div className="mail">
      <Link href={`/stelle/${encodeURIComponent(vorschlag.refnr)}`} className="mail-ico">
        <Mail strokeWidth={2} />
      </Link>
      <div className="mail-main">
        <div className="mail-co">{vorschlag.arbeitgeber ?? "Unbekannter Arbeitgeber"}</div>
        <div className="mail-addr">{vorschlag.scout_fund_email}</div>
        {fehler && (
          <div style={{ color: "var(--red)", fontSize: "12px", marginTop: "3px" }}>{fehler}</div>
        )}
      </div>
      <div className="mail-acts">
        <button
          className="mini ok"
          title="Bestätigen"
          disabled={aktiv}
          onClick={() => ausfuehren("uebernehmen")}
        >
          <Check strokeWidth={2.5} />
        </button>
        <button
          className="mini no"
          title="Verwerfen"
          disabled={aktiv}
          onClick={() => ausfuehren("verwerfen")}
        >
          <X strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export function EmailVorschlaege({ vorschlaege }: { vorschlaege: EmailVorschlag[] }) {
  return (
    <div className="card card-pad">
      <div className="section-head">
        <h2>E-Mail-Vorschläge</h2>
        <p>Der Scout hat Bewerbungs-Adressen gefunden – bitte bestätigen</p>
        <Link className="link" href="/email-scout">
          Scout öffnen →
        </Link>
      </div>
      {vorschlaege.map((v) => (
        <MailZeile key={v.refnr} vorschlag={v} />
      ))}
    </div>
  );
}
