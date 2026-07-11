"use client";

import { useRouter } from "next/navigation";
import { Compass, Plus } from "lucide-react";

// Mobile Aktionsleiste (< 980px) — auf dem Desktop sitzen die Buttons in der
// Topbar. "Aufnehmen" öffnet den Dialog per CustomEvent.
export function MobilAktionen() {
  const router = useRouter();
  return (
    <div className="mobile-actions">
      <button
        className="btn btn-primary"
        onClick={() => router.push("/stellen?kanal=ungeklaert&minScore=72")}
      >
        <Compass strokeWidth={2} />
        Stellen erkunden
      </button>
      <button
        className="btn btn-outline"
        onClick={() => window.dispatchEvent(new CustomEvent("cockpit:aufnehmen"))}
      >
        <Plus strokeWidth={2.2} />
        Aufnehmen
      </button>
    </div>
  );
}
