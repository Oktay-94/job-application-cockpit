"use client";

import { useEffect, useState } from "react";

// Akkordeon-Auf/Zu mit viewport-abhängigem Default. SSR rendert deterministisch
// den Desktop-Default (kein Hydration-Mismatch); beim Mount wird auf Handy
// (≤980px, gleicher Breakpoint wie das Grid) auf den Handy-Default korrigiert.
// Ein einmaliges Aufblitzen auf dem Handy ist bewusst in Kauf genommen (besser
// als Inhalt, der bei jedem Aufklappen kurz leer ist).
const HANDY = "(max-width: 980px)";

export function useAkkordeon(defaultDesktop: boolean, defaultHandy: boolean) {
  const [offen, setOffen] = useState(defaultDesktop);

  useEffect(() => {
    if (window.matchMedia(HANDY).matches) setOffen(defaultHandy);
    // Nur beim Mount: spätere Resizes ändern den Nutzer-State nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [offen, () => setOffen((o) => !o), setOffen] as const;
}
