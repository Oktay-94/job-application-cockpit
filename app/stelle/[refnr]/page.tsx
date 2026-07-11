import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  MapPin,
  Mail,
  Globe,
  FileText,
  CircleHelp,
  Building2,
  Users,
  Clock,
  Sparkles,
  StickyNote,
  CheckCheck,
  Inbox,
  CalendarClock,
  Download,
} from "lucide-react";
import { DetailAktionen } from "@/components/stelle/detail-aktionen";
import { AnschreibenKarte } from "@/components/stelle/anschreiben-karte";
import { ErkundungKarte } from "@/components/stelle/erkundung-karte";
import { NotizFeld } from "@/components/stelle/notiz-feld";
import { BewerbungswegKarte } from "@/components/stelle/bewerbungsweg-karte";
import { StellenanzeigeKarte } from "@/components/stelle/stellenanzeige-karte";
import { AccordionCard } from "@/components/stelle/akkordeon-karte";
import { FinderButton } from "@/components/finder-button";
import { bewerbungenDir, downloadDateiname, findeOrdner, listePdfs } from "@/lib/dokumente";
import { getStelle, cvVariante, quelleLabel, STATUS_LABELS } from "@/lib/stellen";
import { stellenUrl } from "@/lib/stellen-url";
import {
  ARBEITSGEBIET_ICON,
  ARBEITSGEBIET_LABEL,
  parseArbeitsgebiet,
  bewerbungsweg,
  WEG_FARBE,
  WEG_LABEL,
} from "@/lib/stellen-filter";

export const dynamic = "force-dynamic";

const WEG_ICON: Record<string, typeof Mail> = {
  email: Mail,
  portal: Globe,
  formular: FileText,
  ungeklaert: CircleHelp,
  tot: CircleHelp,
};

function scoreFarbe(score: number | null): "green" | "sky" | "amber" | "slate" {
  if (score === null) return "slate";
  if (score >= 80) return "green";
  if (score >= 65) return "sky";
  if (score >= 50) return "amber";
  return "slate";
}

const fmtDatum = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Europe/Berlin",
      }).format(d)
    : null;

function frische(iso: string | null): string | null {
  if (!iso) return null;
  const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  const tage = Math.round((new Date(heute).getTime() - new Date(iso).getTime()) / 86_400_000);
  if (tage <= 0) return "heute";
  if (tage === 1) return "gestern";
  if (tage <= 60) return `vor ${tage} Tagen`;
  const [j, m, t] = iso.split("-");
  return `am ${t}.${m}.${j}`;
}

export default async function StelleSeite({ params }: { params: Promise<{ refnr: string }> }) {
  const { refnr } = await params;
  const stelle = await getStelle(refnr);
  if (!stelle) notFound();

  const ordner = await findeOrdner(refnr);
  const pdfs = ordner ? await listePdfs(ordner) : [];
  const hatAnschreibenPdf = pdfs.some((p) => /^anschreiben\.pdf$/i.test(p));

  const host = (await headers()).get("host") ?? "";
  const istLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(host.replace(/:\d+$/, ""));

  const weg = bewerbungsweg(stelle.bewerbungskanal);
  const KanalIcon = WEG_ICON[weg];
  const kanalFarbe = WEG_FARBE[weg];
  const cv = cvVariante(stelle.score_richtung) === "A" ? "CV Entwicklung" : "CV Sysadmin";
  const gebiet = parseArbeitsgebiet(stelle.arbeitsgebiet);
  const fr = frische(stelle.veroeffentlicht);

  // "Anzeige öffnen": externe_url (bei Formular formular_url); sonst kein Link.
  const anzeigeUrl =
    stelle.bewerbungskanal === "formular"
      ? stelle.formular_url ?? stelle.externe_url
      : stelle.externe_url;

  // Verlauf-Stufen aus echten Zeitstempeln/Status.
  const istBeworben =
    stelle.status === "versendet" || stelle.status === "unzustellbar" || !!stelle.versendet_am;
  const istVersandfertig = stelle.status === "anschreiben_erstellt";
  const istBewertet = !!stelle.bewertet_am || stelle.score !== null;
  const hatRueck = !!stelle.rueckmeldung_am;
  const stufen = [
    {
      t: "Gefunden",
      cls: "done",
      meta: [fmtDatum(stelle.erstellt_am), `Quelle ${quelleLabel(stelle.quelle)}`].filter(Boolean).join(" · "),
    },
    {
      t: "Bewertet",
      cls: istBewertet ? "done" : "upcoming",
      meta: istBewertet
        ? [fmtDatum(stelle.bewertet_am), stelle.score !== null ? `Score ${stelle.score}` : null]
            .filter(Boolean)
            .join(" · ") || "erledigt"
        : "steht aus",
    },
    {
      t: "Versandfertig",
      cls: istBeworben ? "done" : istVersandfertig ? "current" : "upcoming",
      meta: istVersandfertig ? "Anschreiben erstellt" : istBeworben ? "erledigt" : "steht aus",
    },
    {
      t: "Beworben",
      cls: istBeworben ? "done" : "upcoming",
      meta: stelle.versendet_am ? fmtDatum(stelle.versendet_am)! : istBeworben ? "erledigt" : "steht aus",
    },
    {
      t: "Rückmeldung",
      cls: hatRueck ? "done" : "upcoming",
      meta: hatRueck ? fmtDatum(stelle.rueckmeldung_am)! : "steht aus",
    },
  ];

  const hatRueckmeldung =
    !!stelle.rueckmeldung || !!stelle.rueckmeldung_zusammenfassung || !!stelle.rueckmeldung_am || !!stelle.gespraech_am;

  return (
    <div className="stelle-detail">
      {/* HEADER */}
      <section className="head">
        <div className={`score ${scoreFarbe(stelle.score)}`}>
          {stelle.score ?? "—"}
          <small>Match</small>
        </div>
        <div className="head-body">
          <h1>{stelle.titel ?? "Ohne Titel"}</h1>
          <div className="company">
            <span className="org">{stelle.arbeitgeber ?? "Unbekannt"}</span>
            {(stelle.plz || stelle.ort) && (
              <>
                <span className="sep">·</span>
                <MapPin strokeWidth={2} />
                {[stelle.plz, stelle.ort].filter(Boolean).join(" ")}
              </>
            )}
          </div>
          <div className="chips">
            {(stelle.quelle === "bundesagentur" || stelle.quelle === "adzuna") && (
              <span className="chip">
                <span
                  className="asset-ico"
                  style={{ backgroundImage: `url(/quellen/${stelle.quelle === "bundesagentur" ? "ba" : "adzuna"}.svg)` }}
                />
                {quelleLabel(stelle.quelle)}
              </span>
            )}
            {stelle.quelle === "manuell" && <span className="chip">Manuell</span>}
            <span
              className="chip"
              style={{ color: kanalFarbe, background: `color-mix(in srgb, ${kanalFarbe} 14%, transparent)` }}
            >
              <KanalIcon strokeWidth={2} />
              {WEG_LABEL[weg]}
            </span>
            <span className="chip cv">
              <FileText strokeWidth={2} />
              {cv}
            </span>
            <span className="chip">
              <span
                className="asset-ico"
                style={{ backgroundImage: `url(${ARBEITSGEBIET_ICON[gebiet]})` }}
              />
              {ARBEITSGEBIET_LABEL[gebiet]}
            </span>
            {stelle.ist_vermittler === true ? (
              <span className="chip" style={{ color: "#e3811b", background: "color-mix(in srgb, #e3811b 14%, transparent)" }}>
                <Users strokeWidth={2} />
                Zeitarbeit / Vermittler
              </span>
            ) : (
              <span className="chip" style={{ color: "#1d9d52", background: "color-mix(in srgb, #1d9d52 14%, transparent)" }}>
                <Building2 strokeWidth={2} />
                Direktarbeitgeber
              </span>
            )}
            {fr && (
              <span className="chip fresh">
                <Clock strokeWidth={2} />
                Veröffentlicht {fr}
              </span>
            )}
            <span className="chip status">{STATUS_LABELS[stelle.status ?? ""] ?? stelle.status}</span>
          </div>
        </div>
      </section>

      <div className="grid">
        {/* MAIN */}
        <div className="col-main">
          {/* Stellenanzeige — Akkordeon, BA+Adzuna einheitlich (lazy BA-Load) */}
          <StellenanzeigeKarte
            refnr={stelle.refnr}
            beschreibung={stelle.beschreibung}
            quelle={stelle.quelle}
            anzeigeUrl={anzeigeUrl}
          />

          {/* Erkundung — Agent-Vorschlag für die Beschreibung */}
          <ErkundungKarte
            refnr={refnr}
            beschreibung={stelle.beschreibung}
            vorschlag={stelle.erkundung_vorschlag}
            scoutFundEmail={stelle.scout_fund_email}
          />

          {/* Anschreiben */}
          <AnschreibenKarte
            refnr={refnr}
            anschreiben={stelle.anschreiben}
            hatAnschreibenPdf={hatAnschreibenPdf}
            bereitsBeworben={istBeworben}
          />

          {/* Score-Begründung — Akkordeon (Mac: offen, Handy: zu) */}
          {stelle.score_text && (
            <AccordionCard
              icon={<Sparkles className="ic" strokeWidth={2} />}
              titel="Score-Begründung"
              defaultDesktop={true}
              defaultHandy={false}
            >
              <p className="reason">{stelle.score_text}</p>
            </AccordionCard>
          )}

          {/* Notizen — Akkordeon (Mac + Handy: zu) */}
          <AccordionCard
            icon={<StickyNote className="ic" strokeWidth={2} />}
            titel="Notizen"
            defaultDesktop={false}
            defaultHandy={false}
          >
            <NotizFeld refnr={refnr} initial={stelle.notiz} />
          </AccordionCard>
        </div>

        {/* ASIDE */}
        <div className="col-aside">
          {/* Aktionen */}
          <section className="card">
            <div className="card-head">
              <CheckCheck className="ic" strokeWidth={2} />
              <h2>Aktionen</h2>
            </div>
            <div className="card-body">
              <DetailAktionen refnr={refnr} />
            </div>
          </section>

          {/* Bewerbungsweg */}
          <BewerbungswegKarte
            refnr={refnr}
            kanal={stelle.bewerbungskanal}
            bewerbungEmail={stelle.bewerbung_email}
            formularUrl={stelle.formular_url}
            externeUrl={stelle.externe_url}
            anzeigeUrl={stellenUrl(stelle)}
          />

          {/* Verlauf */}
          <section className="card">
            <div className="card-head">
              <Clock className="ic" strokeWidth={2} />
              <h2>Verlauf</h2>
            </div>
            <div className="card-body">
              <div className="timeline">
                {stufen.map((s, i) => (
                  <div className={`tl-item ${s.cls}`} key={s.t}>
                    <div className="tl-rail">
                      <span className="tl-dot" />
                      {i < stufen.length - 1 && <span className="tl-line" />}
                    </div>
                    <div className="tl-body">
                      <div className="tl-title">{s.t}</div>
                      <div className="tl-meta">{s.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Rückmeldung */}
          <section className="card">
            <div className="card-head">
              <Inbox className="ic" strokeWidth={2} />
              <h2>Rückmeldung</h2>
            </div>
            <div className="card-body">
              {hatRueckmeldung ? (
                <div className="rm-fill">
                  {stelle.rueckmeldung_zusammenfassung && <p>{stelle.rueckmeldung_zusammenfassung}</p>}
                  {!stelle.rueckmeldung_zusammenfassung && stelle.rueckmeldung && <p>{stelle.rueckmeldung}</p>}
                  {stelle.rueckmeldung_am && (
                    <div className="rm-row">
                      <Inbox strokeWidth={2} />
                      Antwort am {fmtDatum(stelle.rueckmeldung_am)}
                    </div>
                  )}
                  {stelle.gespraech_am && (
                    <div className="rm-row">
                      <CalendarClock strokeWidth={2} />
                      Gespräch am {fmtDatum(stelle.gespraech_am)}
                      {stelle.gespraech_ort ? ` · ${stelle.gespraech_ort}` : ""}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rm-empty">
                  <div className="rm-ic">
                    <Inbox strokeWidth={2} />
                  </div>
                  <p>Noch keine Antwort der Firma.</p>
                  <p className="small">
                    Sobald die Bewerbung raus ist, ordnet das System eingehende E-Mails automatisch dieser Stelle zu.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Dokumente */}
          <section className="card">
            <div className="card-head">
              <FileText className="ic" strokeWidth={2} />
              <h2>Dokumente</h2>
            </div>
            <div className="card-body">
              {ordner && pdfs.length > 0 ? (
                <>
                  {pdfs.map((datei) => {
                    const url = `/api/dokumente/${encodeURIComponent(refnr)}/${encodeURIComponent(
                      downloadDateiname(datei, stelle.arbeitgeber, cvVariante(stelle.score_richtung))
                    )}`;
                    return (
                      <a className="doc" key={datei} href={url} download>
                        <span className="doc-ic">
                          <FileText strokeWidth={2} />
                        </span>
                        <div>
                          <div className="doc-name">{datei}</div>
                          <div className="doc-sub">wird mitgesendet</div>
                        </div>
                        <span className="doc-dl">
                          <Download strokeWidth={2} />
                        </span>
                      </a>
                    );
                  })}
                  {istLocalhost && (
                    <div className="doc-foot">
                      <FinderButton refnr={refnr} />
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: "var(--fg-muted)", fontSize: "13px" }}>
                  {bewerbungenDir() ? "Noch keine Dokumente." : "BEWERBUNGEN_DIR ist nicht konfiguriert."}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
