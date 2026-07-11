"use client";

import { useEffect, useState } from "react";
import { SidebarInner } from "@/components/shell/sidebar-inner";
import { Topbar } from "@/components/shell/topbar";
import { Toast } from "@/components/shell/toast";
import type { NavZahlen } from "@/lib/shell-zahlen";

// Layout-Shell: feste Sidebar (Desktop) + frosted Topbar, plus echter
// Off-Canvas-Drawer für < 980px. Hält die Drawer-Offen-State, damit
// Menü-Button (Topbar) und Overlay (Sidebar) zusammenspielen.
export function Shell({
  zahlen,
  children,
}: {
  zahlen: NavZahlen;
  children: React.ReactNode;
}) {
  const [drawerOffen, setDrawerOffen] = useState(false);
  const schliessen = () => setDrawerOffen(false);

  // Esc schließt den Drawer; bei offenem Drawer Body-Scroll sperren.
  useEffect(() => {
    if (!drawerOffen) return;
    const aufEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliessen();
    };
    document.addEventListener("keydown", aufEsc);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aufEsc);
      document.body.style.overflow = vorher;
    };
  }, [drawerOffen]);

  return (
    <div className="app">
      <aside className="sidebar">
        <SidebarInner zahlen={zahlen} />
      </aside>

      {drawerOffen && (
        <>
          <div className="drawer-backdrop" onClick={schliessen} aria-hidden />
          <aside className="drawer open" role="dialog" aria-label="Navigation">
            <SidebarInner zahlen={zahlen} onNavigate={schliessen} />
          </aside>
        </>
      )}

      <div className="main">
        <Topbar onMenu={() => setDrawerOffen(true)} zahlen={zahlen} />
        <div className="content">{children}</div>
      </div>

      <Toast />
    </div>
  );
}
