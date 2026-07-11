"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { NachschubSerien } from "@/lib/stellen";

const BASE = 140; // y der Nulllinie
const TOP = 20; // y des Skalen-Maximums
const PX_TAG = 52; // Mindestbreite pro Tag → 30 Tage sprengen den Container = Scroll
const W_MIN = 600; // unter ~12 Tagen bleibt die alte Vollbreite erhalten

// Achse FIX 0–200 mit festen 50er-Stufen. Bewusste Entscheidung: normale Tage
// liegen < 100, die echten Kurven sollen lesbar sein. Ein seltener Ausreißer
// (> 200) wird oben am Deckel abgeschnitten statt die ganze Achse zu strecken.
const SKALA = 200;
const ACHSEN_TICKS = [0, 50, 100, 150, 200];

function punkte(werte: number[], W: number): { x: number; y: number }[] {
  const n = werte.length;
  return werte.map((v, i) => ({
    x: n > 1 ? (i / (n - 1)) * W : 0,
    // am Deckel klemmen → SVG (overflow:visible) blutet bei Ausreißern nicht
    // nach oben in den Titel/die Legende, sondern kappt sauber bei 200.
    y: BASE - (Math.min(v, SKALA) / SKALA) * (BASE - TOP),
  }));
}

function linie(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function flaeche(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  const erst = pts[0];
  const letzt = pts[pts.length - 1];
  return `M${erst.x.toFixed(1)},${BASE} ${linie(pts).slice(1)} L${letzt.x.toFixed(1)},${BASE} Z`;
}

function tagLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

export function NachschubChart({ serien }: { serien: NachschubSerien }) {
  const skala = SKALA;
  const ticks = ACHSEN_TICKS;

  // Zeitachse umgekehrt: neuester Tag LINKS → in die Vergangenheit nach rechts.
  // Alle drei Serien gemeinsam spiegeln, damit Tag↔Wert↔Link gekoppelt bleiben.
  const tage = [...serien.tage].reverse();
  const ba = [...serien.ba].reverse();
  const adzuna = [...serien.adzuna].reverse();

  const n = tage.length;
  // Feste px-Breite: jeder Tag bekommt mindestens PX_TAG → bei 30 Tagen breiter
  // als der Container, dadurch horizontaler Scroll NUR im inneren Wrapper.
  const W = Math.max(W_MIN, n * PX_TAG);

  const baPts = punkte(ba, W);
  const adPts = punkte(adzuna, W);
  const tickY = (v: number) => BASE - (v / skala) * (BASE - TOP);
  const xAt = (i: number) => (n > 1 ? (i / (n - 1)) * W : 0);
  const band = n > 1 ? W / (n - 1) : W;

  const summe = ba.reduce((a, b) => a + b, 0) + adzuna.reduce((a, b) => a + b, 0);

  // Beim Mount ganz nach links scrollen — der neueste Tag ist die relevanteste
  // Stelle und steht jetzt links.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [n]);

  return (
    <div className="card card-pad">
      <div className="section-head">
        <h2>Nachschub</h2>
        <p className="chart-sub">
          <span className="sub-full">Neue Stellen pro Tag · letzte {n} Tage · {summe} gesamt</span>
          <span className="sub-compact">Letzte {n} Tage · {summe} gesamt</span>
        </p>
        <div className="chart-legend">
          <span className="cl">
            <b style={{ background: "var(--sky)" }} />
            Arbeitsagentur
          </span>
          <span className="cl">
            <b style={{ background: "var(--green)" }} />
            Adzuna
          </span>
        </div>
      </div>
      <div className="area-wrap" style={{ position: "relative", paddingLeft: "44px" }}>
        {/* y-Achsen-Titel (Einheit) — vertikal im linken Rand, über dem Plot zentriert.
            Liegt bewusst AUSSERHALB des Scroll-Wrappers → bleibt fix beim Scrollen. */}
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: `${BASE + TOP}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: "9.5px",
            letterSpacing: "0.04em",
            color: "var(--fg-subtle)",
          }}
        >
          Stellen / Tag
        </span>
        {/* y-Achsen-Beschriftung — ebenfalls fix außerhalb des Scrollers, im Gutter. */}
        {ticks.map((v) => (
          <span
            key={v}
            className="num"
            style={{
              position: "absolute",
              left: "16px",
              top: `${tickY(v)}px`,
              width: "24px",
              textAlign: "right",
              transform: "translateY(-50%)",
              fontSize: "10.5px",
              color: "var(--fg-subtle)",
              zIndex: 2,
            }}
          >
            {v}
          </span>
        ))}
        {/* NUR dieser Wrapper scrollt horizontal — overscroll-behavior + touch-action
            verhindern, dass der Scroll auf Seite/Body durchschlägt (mobil wischbar). */}
        <div className="chart-scroll" ref={scrollRef}>
          <div className="chart-inner" style={{ width: `${W}px` }}>
            <svg
              viewBox={`0 0 ${W} 150`}
              width={W}
              height="150"
              preserveAspectRatio="none"
              style={{ overflow: "visible", display: "block" }}
            >
              <defs>
                <linearGradient id="gBa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--sky)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gAd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {ticks.map((v) => (
                <line
                  key={v}
                  x1="0"
                  y1={tickY(v)}
                  x2={W}
                  y2={tickY(v)}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray={v === 0 ? undefined : "3 5"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={flaeche(baPts)} fill="url(#gBa)" />
              <path d={linie(baPts)} fill="none" stroke="var(--sky)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={flaeche(adPts)} fill="url(#gAd)" />
              <path d={linie(adPts)} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {/* Sichtbare Datenpunkte — Klick passiert über die Spalten-Overlays. */}
              {baPts.map((p, i) => (
                <circle key={`b${i}`} cx={p.x} cy={p.y} r="2.6" fill="var(--sky)" vectorEffect="non-scaling-stroke" />
              ))}
              {adPts.map((p, i) => (
                <circle key={`a${i}`} cx={p.x} cy={p.y} r="2.6" fill="var(--green)" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            {/* Pro Tag eine anklickbare, transparente Spalte über dem Plot →
                jeder Datenpunkt/Tag ist als großes Tap-Target erreichbar. */}
            <div className="day-cols">
              {tage.map((iso, i) => {
                const left = Math.max(0, xAt(i) - band / 2);
                const right = Math.min(W, xAt(i) + band / 2);
                return (
                  <Link
                    key={iso}
                    className="day-col"
                    href={`/stellen?tag=${iso}`}
                    title={`Am ${tagLabel(iso)} eingetroffene Stellen`}
                    style={{ left: `${left}px`, width: `${right - left}px` }}
                  />
                );
              })}
            </div>
            {/* Jeder Tag als eigenes, anklickbares Label — keine 3-Tage-Lücke mehr. */}
            <div className="x-axis">
              {tage.map((iso) => (
                <Link
                  key={iso}
                  className="x-tag"
                  href={`/stellen?tag=${iso}`}
                  title={`Am ${tagLabel(iso)} eingetroffene Stellen`}
                >
                  {tagLabel(iso)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
