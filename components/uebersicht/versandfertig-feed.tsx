import Link from "next/link";
import { Users } from "lucide-react";
import { cvVariante, type VersandfertigFeedZeile } from "@/lib/stellen";

// Score-Optik wie im Mockup-Feed: hohe Treffer grün, knappe amber.
function scoreKlasse(score: number | null): "hi" | "mid" {
  return score !== null && score >= 85 ? "hi" : "mid";
}

function QuelleChip({ quelle }: { quelle: string | null }) {
  if (quelle === "bundesagentur")
    return (
      <span className="chip ba">
        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/ba.svg)" }} />
        BA
      </span>
    );
  if (quelle === "adzuna")
    return (
      <span className="chip adzuna">
        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/adzuna.svg)" }} />
        Adzuna
      </span>
    );
  if (quelle === "manuell") return <span className="chip">Manuell</span>;
  return null;
}

function FeedZeile({ z }: { z: VersandfertigFeedZeile }) {
  const variante = cvVariante(z.score_richtung);
  return (
    <div className="job">
      <div className={`score ${scoreKlasse(z.score)} num`}>{z.score ?? "—"}</div>
      <div className="job-main">
        <div className="job-title">{z.titel ?? "Ohne Titel"}</div>
        <div className="job-meta">
          <span>{z.arbeitgeber ?? "Unbekannt"}</span>
          {z.ort && (
            <>
              <span className="sep" />
              <span>{z.ort}</span>
            </>
          )}
          <QuelleChip quelle={z.quelle} />
          <span className={`chip ${variante === "A" ? "va" : "vb"}`}>
            Variante {variante}
          </span>
          {z.ist_vermittler === true && (
            <span className="chip verm">
              <Users strokeWidth={2} />
              Vermittler
            </span>
          )}
        </div>
      </div>
      <Link
        href={`/stelle/${encodeURIComponent(z.refnr)}`}
        className="btn btn-ghost btn-sm job-cta"
      >
        Prüfen
      </Link>
    </div>
  );
}

export function VersandfertigFeed({ feed }: { feed: VersandfertigFeedZeile[] }) {
  return (
    <div className="card card-pad">
      <div className="section-head">
        <h2>Versandfertig</h2>
        <p>Anschreiben erstellt, wartet auf deine Freigabe</p>
        <Link className="link" href="/versandfertig">
          Alle ansehen →
        </Link>
      </div>
      {feed.length === 0 ? (
        <p style={{ color: "var(--fg-muted)", fontSize: "13px", paddingTop: "8px" }}>
          Gerade nichts versandfertig.
        </p>
      ) : (
        feed.map((z) => <FeedZeile key={z.refnr} z={z} />)
      )}
    </div>
  );
}
