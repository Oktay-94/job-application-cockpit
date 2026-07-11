"use client";

import { useRouter } from "next/navigation";

// Ziel einer KPI-Karte: entweder zu einem Abschnitt scrollen (+ kurz
// hervorheben) oder zu einer anderen Seite navigieren. Reine Navigation —
// nichts wird geschrieben/ausgelöst.
export type KpiZiel = { kind: "scroll"; id: string } | { kind: "link"; href: string };

export function KpiKarte({
  icon,
  tint,
  ncls,
  label,
  wert,
  foot,
  ziel,
}: {
  icon: React.ReactNode;
  tint: string;
  ncls: string;
  label: string;
  wert: string;
  foot: string;
  ziel: KpiZiel;
}) {
  const router = useRouter();

  const klick = () => {
    if (ziel.kind === "link") {
      router.push(ziel.href);
      return;
    }
    const el = document.getElementById(ziel.id);
    if (!el) return;
    // Zugeklappte Abteilung erst öffnen, sonst scrollt man zu unsichtbarem Inhalt
    if (el instanceof HTMLDetailsElement) el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("flash");
    // reflow erzwingen, damit die Animation auch bei Wiederholung neu startet
    void el.offsetWidth;
    el.classList.add("flash");
    window.setTimeout(() => el.classList.remove("flash"), 1500);
  };

  return (
    <button type="button" className="kpi kpi-klick" onClick={klick}>
      <div className="kpi-top">
        <span className={`kpi-ico ${tint}`}>{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className={`kpi-val num ${ncls}`}>{wert}</div>
      <div className="kpi-foot">{foot}</div>
    </button>
  );
}
