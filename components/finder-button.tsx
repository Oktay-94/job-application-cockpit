"use client";

import { useRef, useState } from "react";

type Status = "idle" | "laeuft" | "ok" | "fehler";

export function FinderButton({ refnr }: { refnr: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [fehlerText, setFehlerText] = useState("");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function oeffnen() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setStatus("laeuft");
    try {
      const res = await fetch(
        `/api/dokumente/${encodeURIComponent(refnr)}/finder`,
        { method: "POST" }
      );
      if (res.ok) {
        setStatus("ok");
      } else {
        const body = await res.json().catch(() => null);
        setFehlerText(body?.fehler ?? `Fehler (HTTP ${res.status})`);
        setStatus("fehler");
      }
    } catch {
      setFehlerText("Server nicht erreichbar");
      setStatus("fehler");
    }
    resetTimer.current = setTimeout(() => setStatus("idle"), 3000);
  }

  const beschriftung: Record<Status, string> = {
    idle: "Im Finder öffnen",
    laeuft: "Öffne …",
    ok: "✓ Finder geöffnet",
    fehler: `✗ ${fehlerText}`,
  };

  return (
    <button
      onClick={oeffnen}
      disabled={status === "laeuft"}
      className={`flex min-h-12 w-full items-center justify-center rounded-lg border px-4 text-sm transition-colors disabled:opacity-50 ${
        status === "ok"
          ? "border-emerald-500 text-emerald-700"
          : status === "fehler"
            ? "border-red-400 text-red-600"
            : "border-zinc-300 text-zinc-700 hover:border-zinc-400 active:bg-zinc-100"
      }`}
    >
      {beschriftung[status]}
    </button>
  );
}
