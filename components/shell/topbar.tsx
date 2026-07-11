"use client";

import { useSyncExternalStore, useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Compass, Search, Moon, Sun, Plus } from "lucide-react";
import type { NavZahlen } from "@/lib/shell-zahlen";

type Theme = "light" | "dark";

// Quelle der Wahrheit fürs Theme ist das data-theme-Attribut auf <html> (vom
// Inline-Script vor dem ersten Paint gesetzt). useSyncExternalStore liest es
// direkt — kein setState-im-Effect, kein Hydration-Mismatch.
function abonniere(callback: () => void): () => void {
  const beobachter = new MutationObserver(callback);
  beobachter.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => beobachter.disconnect();
}

function leseTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function useTheme(): { theme: Theme; toggle: () => void } {
  // Server-Snapshot "light" — das echte Theme setzt das Inline-Script clientseitig.
  const theme = useSyncExternalStore(abonniere, leseTheme, () => "light" as Theme);
  const toggle = () => {
    const next: Theme = leseTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* localStorage gesperrt — Theme gilt dann nur für diese Session */
    }
  };
  return { theme, toggle };
}

// Tageszeit-Begrüßung (Emojis hier ausdrücklich gewünscht: Sonne tagsüber,
// Mond abends/nachts). Buckets nach echter lokaler Uhrzeit.
function begruessung(stunde: number): { text: string; emoji: string } {
  if (stunde >= 5 && stunde < 11) return { text: "Guten Morgen", emoji: "🌅" };
  if (stunde >= 11 && stunde < 14) return { text: "Guten Mittag", emoji: "☀️" };
  if (stunde >= 14 && stunde < 18) return { text: "Guten Nachmittag", emoji: "🌤️" };
  if (stunde >= 18 && stunde < 22) return { text: "Guten Abend", emoji: "🌙" };
  return { text: "Gute Nacht", emoji: "🌛" }; // 22–05
}

// Uhrzeit als externe Quelle: tickt jede Minute. getServerSnapshot → null,
// damit Server und erste Client-Render identisch (leer) sind (kein Mismatch);
// nach dem Mount füllt die echte lokale Zeit. Kein setState-im-Effect.
function abonniereZeit(callback: () => void): () => void {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}
function useGruss(): { gruss: string; datum: string } {
  const minute = useSyncExternalStore(
    abonniereZeit,
    () => Math.floor(Date.now() / 60_000),
    () => null
  );
  if (minute === null) return { gruss: "", datum: "" };
  const jetzt = new Date();
  const { text, emoji } = begruessung(jetzt.getHours());
  const tag = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(jetzt);
  const zeit = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(jetzt);
  return { gruss: `${text}, Max ${emoji}`, datum: `${tag} · ${zeit} Uhr` };
}

export function Topbar({ onMenu, zahlen }: { onMenu: () => void; zahlen: NavZahlen }) {
  const { theme, toggle } = useTheme();
  const { gruss, datum } = useGruss();
  const pfad = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const sucheRef = useRef<HTMLInputElement>(null);

  // Topbar-Titel ist seitenabhängig (Mockups): "/" zeigt die Begrüßung,
  // "/stellen" den Seitentitel + Anzahl. Auf /stellen blendet die Topbar-Suche
  // aus — die Seite hat ihr eigenes (funktionierendes) Suchfeld.
  const aufStellen = pfad === "/stellen" || pfad.startsWith("/stelle/");
  // "Stelle aufnehmen" gehört nur auf die Liste — auf der Detailseite ist der
  // Aufnahme-Dialog nicht eingebunden, der Knopf wäre dort tot.
  const aufStellenListe = pfad === "/stellen";
  const titel = aufStellen ? "Stellen" : gruss;
  const subline = aufStellen ? `${zahlen.stellen} Stellen` : datum;

  // ⌘K fokussiert die Topbar-Suche (nur wo sie sichtbar ist; auf /stellen
  // übernimmt das Seiten-Suchfeld selbst).
  useEffect(() => {
    if (aufStellen) return;
    const aufTaste = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        sucheRef.current?.focus();
      }
    };
    document.addEventListener("keydown", aufTaste);
    return () => document.removeEventListener("keydown", aufTaste);
  }, [aufStellen]);

  const sucheAbschicken = (e: React.FormEvent) => {
    e.preventDefault();
    const wert = q.trim();
    router.push(wert ? `/stellen?q=${encodeURIComponent(wert)}` : "/stellen");
  };

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" aria-label="Menü öffnen" onClick={onMenu}>
        <Menu strokeWidth={2} />
      </button>

      <div className="greet">
        <h1>{titel}</h1>
        <span>{subline}</span>
      </div>
      <div className="topbar-spacer" />

      {aufStellenListe && (
        <button
          className="btn btn-ghost hide-sm"
          onClick={() => window.dispatchEvent(new CustomEvent("cockpit:aufnehmen"))}
        >
          <Plus strokeWidth={2.2} />
          Stelle aufnehmen
        </button>
      )}

      <button
        className="btn btn-primary hide-sm"
        onClick={() => router.push("/stellen?kanal=ungeklaert&minScore=72")}
        title="Zu den Stellen, die noch erkundet werden müssen"
      >
        <Compass strokeWidth={2} />
        Stellen erkunden
      </button>

      {!aufStellen && (
        <form className="search" onSubmit={sucheAbschicken}>
          <Search strokeWidth={2} />
          <input
            ref={sucheRef}
            placeholder="Stellen suchen…"
            aria-label="Stellen suchen"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="kbd">⌘K</span>
        </form>
      )}

      <button
        className="icon-btn"
        onClick={toggle}
        aria-label="Design wechseln"
        title={theme === "dark" ? "Helles Design" : "Dunkles Design"}
      >
        {theme === "dark" ? <Sun strokeWidth={2} /> : <Moon strokeWidth={2} />}
      </button>
      <div className="avatar">MM</div>
    </header>
  );
}
