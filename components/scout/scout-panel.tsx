import { Search, Shield } from "lucide-react";

// Scout-Status-Karte. Der E-Mail-Scout läuft als n8n-Workflow automatisch
// täglich 11:00 (Europe/Berlin) — es gibt bewusst keine manuelle Auslösung aus
// dem Cockpit (kein scharfer Webhook dafür). Reine Anzeige.
export function ScoutPanel({
  letzterLauf,
  poolOffen,
}: {
  letzterLauf: string;
  poolOffen: number;
}) {
  return (
    <div className="scout-panel">
      <div className="sp-body">
        <div className="sp-orb">
          <Search strokeWidth={2} />
        </div>
        <div className="sp-info">
          <div className="sp-status">
            <span className="live" />
            <span>Läuft automatisch</span>
          </div>
          <div className="sp-meta">
            <span>
              Letzter Lauf: <b>{letzterLauf}</b>
            </span>
            <span className="sep">·</span>
            <span>
              <b>{poolOffen}</b> Stellen im Pool
            </span>
            <span className="sep">·</span>
            <span>
              Nächster Lauf: <b>täglich 11:00</b>
            </span>
          </div>
        </div>
      </div>
      <div className="sp-foot">
        <span className="shield">
          <Shield strokeWidth={2} />
        </span>
        <span>
          <b>Sicherheitsgrenze:</b> Stößt der Scout auf ein CAPTCHA, überspringt er die Stelle und
          umgeht es nicht.
        </span>
      </div>
    </div>
  );
}
