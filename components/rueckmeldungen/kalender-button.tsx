"use client";

import { CalendarPlus } from "lucide-react";

// ICS-Zeit im UTC-Basic-Format YYYYMMDDTHHMMSSZ.
function icsZeit(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// „In Kalender" — erzeugt eine .ics-Datei aus dem Gesprächstermin und löst den
// Download aus (rein clientseitig, kein Tracker nötig). 1-Stunden-Block.
export function KalenderButton({
  firma,
  role,
  startISO,
  ort,
  summary,
}: {
  firma: string;
  role: string;
  startISO: string;
  ort: string;
  summary: string;
}) {
  const herunterladen = () => {
    const start = icsZeit(startISO);
    const ende = icsZeit(new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString());
    const stamp = icsZeit(new Date().toISOString());
    const uid = `gespraech-${start}-${Math.random().toString(36).slice(2)}@cockpit`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Bewerbungs-Cockpit//DE",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${ende}`,
      `SUMMARY:${esc(`Gespräch: ${firma}`)}`,
      `LOCATION:${esc(ort)}`,
      `DESCRIPTION:${esc([role, summary].filter(Boolean).join(" — "))}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Gespraech_${firma.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="hbtn hbtn-ghost" onClick={herunterladen}>
      <CalendarPlus strokeWidth={2} />
      In Kalender
    </button>
  );
}
