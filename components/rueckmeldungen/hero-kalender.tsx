"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// "Heute" erst nach dem Mount markieren (Server-Snapshot = false), damit
// SSR und erste Client-Render identisch sind (kein Hydration-Mismatch).
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// Kleiner Monatskalender im Hero. Monatsraster wird für JEDEN Monat korrekt
// berechnet (Mo-first), Start-Monat = Monat des Termins.
export function HeroKalender({ terminISO }: { terminISO: string }) {
  const [ty, tm, td] = terminISO.split("-").map(Number); // Jahr, Monat (1-12), Tag
  const [view, setView] = useState({ y: ty, m: tm - 1 }); // m: 0-basiert
  const mounted = useMounted();
  const heute = new Date();

  const istTermin = (d: number) => view.y === ty && view.m === tm - 1 && d === td;
  const istHeute = (d: number) =>
    mounted &&
    heute.getFullYear() === view.y &&
    heute.getMonth() === view.m &&
    heute.getDate() === d;

  // Wochentag des 1. (Mo=0 … So=6) und Tage im Monat.
  const ersterWt = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const tageImMonat = new Date(view.y, view.m + 1, 0).getDate();
  const zellen: (number | null)[] = [
    ...Array<null>(ersterWt).fill(null),
    ...Array.from({ length: tageImMonat }, (_, i) => i + 1),
  ];

  const prev = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  return (
    <div className="hero-cal">
      <div className="hcal-head">
        <button className="hcal-nav" onClick={prev} aria-label="Vorheriger Monat">
          <ChevronLeft strokeWidth={2.4} />
        </button>
        <span className="hcal-title">
          {MONATE[view.m]} {view.y}
        </span>
        <button className="hcal-nav" onClick={next} aria-label="Nächster Monat">
          <ChevronRight strokeWidth={2.4} />
        </button>
      </div>
      <div className="hcal-grid hcal-wd">
        {WOCHENTAGE.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="hcal-grid">
        {zellen.map((tag, i) =>
          tag === null ? (
            <span key={`e${i}`} />
          ) : (
            <span
              key={tag}
              className={`hcal-day${istTermin(tag) ? " termin" : ""}${
                istHeute(tag) ? " heute" : ""
              }`}
            >
              {tag}
            </span>
          )
        )}
      </div>
    </div>
  );
}
