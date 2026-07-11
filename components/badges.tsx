export function ScoreBadge({ score }: { score: number | null }) {
  const farbe =
    score === null
      ? "bg-zinc-100 text-zinc-500"
      : score >= 75
        ? "bg-emerald-100 text-emerald-700"
        : score >= 50
          ? "bg-amber-100 text-amber-700"
          : "bg-zinc-100 text-zinc-500";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${farbe}`}
    >
      {score ?? "–"}
    </span>
  );
}

export function QuelleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500">
      {label}
    </span>
  );
}

import type { Bewerbungskanal } from "@/lib/stellen";

const KANAL_BADGES: Record<Bewerbungskanal, { label: string; farbe: string }> = {
  email: { label: "E-Mail", farbe: "bg-emerald-100 text-emerald-700" },
  formular: { label: "Formular", farbe: "bg-sky-100 text-sky-700" },
  portal: { label: "Portal", farbe: "bg-violet-100 text-violet-700" },
  tot: { label: "Tot", farbe: "bg-zinc-200 text-zinc-500" },
};

// No badge while the channel is still unclarified (NULL)
export function KanalBadge({ kanal }: { kanal: Bewerbungskanal | null }) {
  if (!kanal) return null;
  const { label, farbe } = KANAL_BADGES[kanal];
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${farbe}`}
    >
      {label}
    </span>
  );
}

// Nur sichtbar bei ist_vermittler === true; bei false/NULL kein Badge.
// Orange grenzt sich bewusst von Score-Amber, Quelle-Border und CV-Grau ab.
export function VermittlerBadge() {
  return (
    <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
      Zeitfirma
    </span>
  );
}

export function CvBadge({ variante }: { variante: "A" | "B" }) {
  return (
    <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
      CV {variante}
    </span>
  );
}
