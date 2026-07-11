import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell/shell";
import { getNavZahlen } from "@/lib/shell-zahlen";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bewerbungs-Cockpit",
  description: "Cockpit für die Bewerbungspipeline",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Cockpit",
    statusBarStyle: "default",
  },
  other: {
    // Next's appleWebApp.capable only emits the modern
    // mobile-web-app-capable tag; older iOS needs the apple- prefix
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // cover so the sticky topbar can extend under the notch/status bar
  viewportFit: "cover",
};

// No-Flash: setzt data-theme synchron VOR dem ersten Paint (localStorage
// überstimmt System). Muss inline laufen, sonst blitzt das falsche Theme auf.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

// Sidebar-Badges pro Request frisch. Begrüßung/Datum berechnet die Topbar
// client-seitig (Layouts re-rendern bei Client-Navigation nicht, eine
// server-berechnete Begrüßung würde sonst auf dem alten Stand einfrieren).
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const zahlen = await getNavZahlen();

  return (
    // suppressHydrationWarning: das Theme-Script mutiert data-theme am <html>
    // VOR der Hydration; ohne das meldet React den (erwarteten) Attribut-Mismatch.
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Blockierend im <head>: setzt data-theme vor dem ersten Paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Shell zahlen={zahlen}>{children}</Shell>
      </body>
    </html>
  );
}
