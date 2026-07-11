import Link from "next/link";
import {
  Send,
  Inbox,
  CalendarDays,
  Trophy,
  XCircle,
  Target,
  CircleHelp,
  Clock,
  MapPin,
  Sparkles,
  CheckCheck,
  Video,
  Info,
  MailCheck,
} from "lucide-react";
import { KpiKarte } from "@/components/rueckmeldungen/kpi-karte";
import { Abteilung } from "@/components/rueckmeldungen/abteilung";
import { HeroKalender } from "@/components/rueckmeldungen/hero-kalender";
import { VorschlagAktionen } from "@/components/rueckmeldungen/vorschlag-aktionen";
import { KalenderButton } from "@/components/rueckmeldungen/kalender-button";
import { getRueckmeldungen } from "@/lib/stellen";

export const dynamic = "force-dynamic";

export default async function RueckmeldungenSeite() {
  const d = await getRueckmeldungen();
  return (
    <div className="rueck">
      <div className="page-head">
        <div>
          <h1>Rückmeldungen</h1>
          <p>Antworten der Firmen — Einladungen, Zusagen, Absagen auf einen Blick.</p>
        </div>
      </div>

      {/* KPIs — klickbar: scrollen zum passenden Abschnitt bzw. Versendet → Stellen */}
      <div className="kpis">
        <KpiKarte
          icon={<Send strokeWidth={2} />}
          tint="t-indigo"
          ncls="n-indigo"
          {...d.kpis.versendet}
          ziel={{ kind: "link", href: "/stellen?status=beworben" }}
        />
        <KpiKarte
          icon={<Inbox strokeWidth={2} />}
          tint="t-slate"
          ncls="n-ink"
          {...d.kpis.antworten}
          ziel={{ kind: "scroll", id: "r-zusagen" }}
        />
        <KpiKarte
          icon={<CalendarDays strokeWidth={2} />}
          tint="t-teal"
          ncls="n-teal"
          {...d.kpis.einladungen}
          ziel={{ kind: "scroll", id: "r-einladungen" }}
        />
        <KpiKarte
          icon={<Trophy strokeWidth={2} />}
          tint="t-green"
          ncls="n-green"
          {...d.kpis.zusagen}
          ziel={{ kind: "scroll", id: "r-zusagen" }}
        />
        <KpiKarte
          icon={<XCircle strokeWidth={2} />}
          tint="t-slate"
          ncls="n-slate"
          {...d.kpis.absagen}
          ziel={{ kind: "scroll", id: "r-absagen" }}
        />
        <KpiKarte
          icon={<Target strokeWidth={2} />}
          tint="t-amber"
          ncls="n-amber"
          {...d.kpis.einladungsquote}
          ziel={{ kind: "scroll", id: "r-einladungen" }}
        />
      </div>

      {/* Hero: Nächstes Gespräch */}
      {d.hero && (
        <div className="hero">
          <div className="hero-eyebrow">
            <span className="lab">Nächstes Gespräch</span>
            <span className="countdown">
              <Clock strokeWidth={2} />
              {d.hero.countdown}
            </span>
          </div>
          <div className="hero-co">{d.hero.firma}</div>
          <div className="hero-role">{d.hero.role}</div>
          <div className="hero-meta">
            <span>
              <CalendarDays strokeWidth={2} />
              {d.hero.datum}
            </span>
            <span>
              <MapPin strokeWidth={2} />
              {d.hero.ort}
            </span>
          </div>
          <div className="hero-sum">{d.hero.summary}</div>
          <div className="hero-acts">
            <KalenderButton
              firma={d.hero.firma}
              role={d.hero.role}
              startISO={d.hero.startISO}
              ort={d.hero.ort}
              summary={d.hero.summary}
            />
          </div>
          <HeroKalender terminISO={d.hero.terminISO} />
        </div>
      )}

      {/* Split */}
      <div className="split">
        {/* LINKS */}
        <div className="col">
          {/* Zu bestätigen */}
          <Abteilung
            id="r-zubestaetigen"
            tint="t-amber"
            titel="Zu bestätigen"
            icon={<CircleHelp strokeWidth={2} />}
            count={d.zuBestaetigen.length}
          >
            {d.zuBestaetigen.length === 0 && (
              <div className="card" style={{ color: "var(--fg-muted)", fontSize: "13px" }}>
                Keine offenen Vorschläge.
              </div>
            )}
            {d.zuBestaetigen.map((c) => (
              <div className="card confirm" key={c.refnr}>
                <div className="c-row1">
                  <div>
                    <div className="firma">{c.firma}</div>
                    <div className="titel">Antwort von {c.von}</div>
                  </div>
                  <div className="when">{c.when}</div>
                </div>
                <span className="badge amber">
                  <Sparkles strokeWidth={2} />
                  {c.badge}
                  {c.confidence && <span className="conf num">· {c.confidence}</span>}
                </span>
                <div className="summary">{c.summary}</div>
                <VorschlagAktionen refnr={c.refnr} firma={c.firma} />
                {c.hint && (
                  <div className="hint">
                    <Info strokeWidth={2} />
                    {c.hint}
                  </div>
                )}
              </div>
            ))}
          </Abteilung>

          {/* Eingangsbestätigung */}
          <Abteilung
            id="r-eingang"
            tint="t-slate"
            titel="Eingangsbestätigung"
            icon={<MailCheck strokeWidth={2} />}
            count={d.eingangsbestaetigungen.length}
          >
            {d.eingangsbestaetigungen.length === 0 && (
              <div className="card" style={{ color: "var(--fg-muted)", fontSize: "13px" }}>
                Keine Eingangsbestätigungen.
              </div>
            )}
            {d.eingangsbestaetigungen.map((c) => (
              <div className="card" key={c.refnr}>
                <details className="eingang">
                  <summary>
                    <div className="c-row1">
                      <div className="firma">{c.firma}</div>
                      <div className="when">{c.when}</div>
                    </div>
                    <div className="summary">{c.summary}</div>
                  </summary>
                  <div className="eingang-detail">
                    <div className="titel">Von {c.von}</div>
                    {c.empfangen && <div className="titel">Empfangen: {c.empfangen}</div>}
                    <div className="summary">{c.summary}</div>
                  </div>
                </details>
                <VorschlagAktionen refnr={c.refnr} firma={c.firma} modus="gesehen" />
              </div>
            ))}
          </Abteilung>

          {/* Angekommen */}
          <Abteilung
            id="r-angekommen"
            tint="t-slate"
            titel="Angekommen"
            icon={<Inbox strokeWidth={2} />}
            count={d.angekommen.length}
          >
            {d.angekommen.length === 0 && (
              <div className="card" style={{ color: "var(--fg-muted)", fontSize: "13px" }}>
                Keine angekommenen Bestätigungen.
              </div>
            )}
            {d.angekommen.map((a) => (
              <div className="card" key={a.refnr}>
                <div className="c-row1">
                  <div>
                    <div className="firma">{a.firma}</div>
                    <div className="titel">{a.role}</div>
                  </div>
                  <div className="when">{a.when}</div>
                </div>
                <span className="badge green">
                  <CheckCheck strokeWidth={2} />
                  Eingang bestätigt
                </span>
                {a.summary && <div className="summary">{a.summary}</div>}
              </div>
            ))}
          </Abteilung>

          {/* Zusagen */}
          <Abteilung
            id="r-zusagen"
            tint="t-green"
            titel="Zusagen"
            icon={<Trophy strokeWidth={2} />}
            count={d.zusagen.length}
          >
            {d.zusagen.map((z) => (
              <div className="card zusage lift" key={z.firma}>
                <div className="zusage-top">
                  <div>
                    <div className="firma">{z.firma}</div>
                    <div className="titel">{z.role}</div>
                  </div>
                  <div className="when">{z.when}</div>
                </div>
                <span className="badge">
                  <CheckCheck strokeWidth={2} />
                  Zusage
                </span>
                <div className="summary">{z.summary}</div>
              </div>
            ))}
          </Abteilung>

          {/* Weitere Einladungen */}
          <Abteilung
            id="r-einladungen"
            tint="t-teal"
            titel="Weitere Einladungen"
            icon={<CalendarDays strokeWidth={2} />}
            count={d.einladungen.length}
          >
            {d.einladungen.map((e) => (
              <div className="card lift" key={e.firma}>
                <div className="c-row1">
                  <div>
                    <div className="firma">{e.firma}</div>
                    <div className="titel">{e.role}</div>
                  </div>
                  <div className="when">{e.when}</div>
                </div>
                <span className="badge teal">
                  <CalendarDays strokeWidth={2} />
                  Einladung
                </span>
                <div className="meta">
                  <span>
                    <Clock strokeWidth={2} />
                    {e.datum}
                  </span>
                  <span>
                    <Video strokeWidth={2} />
                    {e.format}
                  </span>
                </div>
                <div className="summary">{e.summary}</div>
              </div>
            ))}
          </Abteilung>
        </div>

        {/* RECHTS */}
        <div className="col">
          {/* Wartet */}
          <Abteilung
            tint="t-amber"
            titel="Wartet auf Antwort"
            icon={<Clock strokeWidth={2} />}
            count={d.wartet.length}
          >
            <div className="card">
              {d.wartet.map((w) => (
                <Link
                  className="wait-row"
                  key={w.refnr}
                  href={`/stelle/${encodeURIComponent(w.refnr)}`}
                >
                  <span className="wait-dot" />
                  <span className="wait-name">{w.firma}</span>
                  <span className="wait-when">{w.when}</span>
                </Link>
              ))}
            </div>
          </Abteilung>

          {/* Absagen */}
          <Abteilung
            id="r-absagen"
            tint="t-slate"
            titel="Absagen"
            icon={<XCircle strokeWidth={2} />}
            count={d.absagen.length}
          >
            {d.absagen.map((a) => (
              <Link
                className="card absage lift"
                key={a.refnr}
                href={`/stelle/${encodeURIComponent(a.refnr)}`}
              >
                <div className="c-row1">
                  <div>
                    <div className="firma">{a.firma}</div>
                    <div className="titel">{a.role}</div>
                  </div>
                  <div className="when">{a.when}</div>
                </div>
                <div className="summary">{a.summary}</div>
              </Link>
            ))}
          </Abteilung>
        </div>
      </div>
    </div>
  );
}
