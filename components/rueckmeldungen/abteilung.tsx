import { ChevronDown } from "lucide-react";

// Auf-/zuklappbare Abteilung — natives <details>, kein Client-JS nötig.
// sec-head (inkl. Zähler) ist die summary und bleibt zugeklappt sichtbar.
// Default: leere Abteilungen zu, gefüllte offen (Server kennt count).
export function Abteilung({
  id,
  icon,
  tint,
  titel,
  count,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  tint: string;
  titel: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <details className="abt" id={id} open={count > 0}>
      <summary>
        <div className="sec-head">
          <span className={`sh-ico ${tint}`}>{icon}</span>
          <h2>{titel}</h2>
          <span className="count num">{count}</span>
          <ChevronDown className="abt-chev" strokeWidth={2} />
        </div>
      </summary>
      {children}
    </details>
  );
}
