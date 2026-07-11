"use client";

import { useEffect, useState } from "react";

// Schlanker Toast: lauscht auf CustomEvent "cockpit:toast" (detail = Text) und
// blendet die Meldung ~3 s ein. setState läuft im Event-Callback, nicht im
// Effect-Body → lint-sauber.
export function Toast() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const auf = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setText(typeof detail === "string" ? detail : "");
      clearTimeout(timer);
      timer = setTimeout(() => setText(null), 3000);
    };
    window.addEventListener("cockpit:toast", auf);
    return () => {
      window.removeEventListener("cockpit:toast", auf);
      clearTimeout(timer);
    };
  }, []);

  if (text === null) return null;
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}
