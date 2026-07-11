"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Send,
  Search,
  Inbox,
  Star,
  Settings,
  Heart,
  CalendarX,
} from "lucide-react";
import type { NavZahlen } from "@/lib/shell-zahlen";

interface NavEintrag {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number | null;
  alert?: boolean;
}

// Aktiv-Erkennung: "/" exakt, sonst Präfix; Stellen-Detail (/stelle/...) hält
// den Stellen-Punkt aktiv.
function istAktiv(pfad: string, href: string): boolean {
  if (href === "/") return pfad === "/";
  if (href === "/stellen") return pfad === "/stellen" || pfad.startsWith("/stelle/");
  return pfad === href || pfad.startsWith(`${href}/`);
}

export function SidebarInner({
  zahlen,
  onNavigate,
}: {
  zahlen: NavZahlen;
  onNavigate?: () => void;
}) {
  const pfad = usePathname();

  const steuerung: NavEintrag[] = [
    { label: "Übersicht", href: "/", icon: LayoutDashboard },
    { label: "Stellen", href: "/stellen", icon: Briefcase, badge: zahlen.stellen },
    {
      label: "Versandfertig",
      href: "/versandfertig",
      icon: Send,
      badge: zahlen.versandfertig,
      alert: true,
    },
    { label: "Abgelaufen", href: "/abgelaufen", icon: CalendarX },
    { label: "E-Mail-Scout", href: "/email-scout", icon: Search },
    {
      label: "Rückmeldungen",
      href: "/rueckmeldungen",
      icon: Inbox,
      badge: zahlen.rueckmeldungen,
      alert: true,
    },
    { label: "Agent", href: "/agent", icon: Star },
  ];
  const system: NavEintrag[] = [
    { label: "Einstellungen", href: "/einstellungen", icon: Settings },
  ];

  const punkt = (e: NavEintrag) => {
    const aktiv = istAktiv(pfad, e.href);
    const Icon = e.icon;
    const zeigeBadge = e.badge !== undefined && e.badge !== null && e.badge > 0;
    return (
      <Link
        key={e.href}
        href={e.href}
        onClick={onNavigate}
        aria-current={aktiv ? "page" : undefined}
        className={`nav-item${aktiv ? " active" : ""}`}
      >
        <Icon strokeWidth={2} />
        {e.label}
        {zeigeBadge && (
          <span className={`nav-badge num${e.alert ? " alert" : ""}`}>{e.badge}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="brand">
        <div className="brand-mark">
          <Heart width={19} height={19} strokeWidth={2} />
        </div>
        <div>
          <div className="brand-name">Bewerbungs-Herz</div>
          <div className="brand-sub">Cockpit</div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-label">Steuerung</div>
        {steuerung.map(punkt)}
        <div className="nav-label">System</div>
        {system.map(punkt)}
      </nav>

      <div className="sidebar-foot">
        <div className="status-row">
          <span className="dot on" /> n8n-Motor <b>läuft</b>
        </div>
        <div className="status-row">
          <span className="dot on" /> Bounce-Wächter <b>aktiv</b>
        </div>
        <div className="status-row">
          <span className="dot warn" /> Letzter Nachschub <b>09:15</b>
        </div>
      </div>
    </>
  );
}
