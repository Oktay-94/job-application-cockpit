"use client";

import { useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useAkkordeon } from "./use-akkordeon";

// Generische Akkordeon-Karte der Detailseite: klickbarer Titel-Balken klappt
// den Body auf/zu. headAction (z. B. "Anzeige öffnen") sitzt rechts im Balken
// und löst NICHT das Umschalten aus (stopPropagation). onOpen feuert einmalig
// beim ersten Aufklappen — für lazy-load (BA-Volltext).
export function AccordionCard({
  icon,
  titel,
  defaultDesktop,
  defaultHandy,
  headAction,
  onOpen,
  children,
}: {
  icon: ReactNode;
  titel: string;
  defaultDesktop: boolean;
  defaultHandy: boolean;
  headAction?: ReactNode;
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [offen, umschalten] = useAkkordeon(defaultDesktop, defaultHandy);
  const schonGeoeffnet = useRef(false);

  const klick = () => {
    if (!offen && !schonGeoeffnet.current) {
      schonGeoeffnet.current = true;
      onOpen?.();
    }
    umschalten();
  };

  return (
    <section className={`card${offen ? "" : " collapsed"}`}>
      <div
        className="card-head akk-head"
        role="button"
        tabIndex={0}
        aria-expanded={offen}
        onClick={klick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            klick();
          }
        }}
      >
        {icon}
        <h2>{titel}</h2>
        <div className="akk-right">
          {headAction && (
            <span onClick={(e) => e.stopPropagation()} role="presentation">
              {headAction}
            </span>
          )}
          <ChevronDown className="akk-chev" strokeWidth={2.5} />
        </div>
      </div>
      {offen && <div className="card-body">{children}</div>}
    </section>
  );
}
