"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type PaginationState,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Search,
  CircleCheckBig,
  List,
  Boxes,
  Mail,
  Users,
  ChevronDown,
  Check,
  X,
  MapPin,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowDownUp,
  FileText,
  CircleHelp,
  CircleSlash,
  CalendarDays,
  Skull,
} from "lucide-react";
import {
  ARBEITSGEBIETE,
  ARBEITSGEBIET_LABEL,
  ARBEITSGEBIET_SLUG,
  ARBEITSGEBIET_ICON,
  kanalGruppe,
  bewerbungsweg,
  WEG_FARBE,
  WEG_LABEL,
  parseArbeitsgebiet,
  stellenStatusGruppe,
  type Arbeitsgebiet,
  type StellenListeZeile,
} from "@/lib/stellen-filter";

export type ArbeitgeberWahl = "alle" | "direkt" | "vermittler";

// Datums-Fenster „Eingetroffen". Zahlen-Keys = Tage-Fenster (inkl. heute),
// dieselbe Tagesdefinition wie der Nachschub-Chart (erstellt_am::date, Berlin).
export type EingetroffenWahl = "alle" | "heute" | "7" | "14";

export interface StellenStart {
  status: string[];
  quelle: string[];
  gebiet: string[];
  kanal: string[];
  arbeitgeber: ArbeitgeberWahl;
  eingetroffen: EingetroffenWahl;
  minScore: number;
  maxScore: number; // 0 = keine Obergrenze (Score-Histogramm-Deep-Link: 80–89 etc.)
  tag: string; // exakter Eingetroffen-Tag YYYY-MM-DD (Nachschub-Datum-Deep-Link); "" = aus
  suche: string;
}

interface Option {
  key: string;
  label: string;
  swatch?: string;
  icon?: string; // SVG-Pfad (statt Farbpunkt), z. B. für Arbeitsgebiete
}

const STATUS_OPTS: Option[] = [
  { key: "neu", label: "Neu", swatch: "var(--slate)" },
  { key: "bewertet", label: "Bewertet", swatch: "var(--sky)" },
  { key: "versandfertig", label: "Versandfertig", swatch: "var(--accent)" },
  { key: "beworben", label: "Beworben", swatch: "var(--violet)" },
];
const QUELLE_OPTS: Option[] = [
  { key: "bundesagentur", label: "Arbeitsagentur", swatch: "var(--sky)" },
  { key: "adzuna", label: "Adzuna", swatch: "var(--green)" },
  { key: "manuell", label: "Manuell", swatch: "var(--accent)" },
];
const KANAL_OPTS: Option[] = [
  { key: "email", label: "E-Mail", swatch: "var(--green)" },
  { key: "webform", label: "Portal / Formular", swatch: "var(--sky)" },
  { key: "ungeklaert", label: "Ungeklärt", swatch: "var(--fg-subtle)" },
  { key: "tot", label: "Tot", swatch: "var(--red)" },
];
const ARBEITGEBER_OPTS: Option[] = [
  { key: "alle", label: "Alle" },
  { key: "direkt", label: "Nur Direkt" },
  { key: "vermittler", label: "Nur Vermittler" },
];
const EINGETROFFEN_OPTS: { key: EingetroffenWahl; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "heute", label: "Heute" },
  { key: "7", label: "Letzte 7 Tage" },
  { key: "14", label: "Letzte 14 Tage" },
];

// Tag (YYYY-MM-DD) n Tage vor dem Anker, über UTC gerechnet (DST-sicher) — wie
// der Nachschub-Chart (heuteUtc ± 86_400_000). Lexikografischer Vergleich von
// ISO-Tagesstrings ist korrekt geordnet.
function tageZurueck(heute: string, n: number): string {
  const d = new Date(`${heute}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
// Sortierfelder fürs mobile Sort-Control (Desktop sortiert über die Spaltenköpfe,
// die am Handy ausgeblendet sind). IDs = Spalten-IDs der Tabelle.
const SORT_OPTS: { id: string; label: string }[] = [
  { id: "score", label: "Score" },
  { id: "titel", label: "Stelle" },
  { id: "ort", label: "Ort" },
];
const GEBIET_FARBE: Record<Arbeitsgebiet, string> = {
  Anwendungsentwicklung: "var(--accent)",
  Systemintegration: "var(--sky)",
  "Cloud/DevOps": "var(--violet)",
  "IT-Support": "var(--amber)",
  Sonstiges: "var(--slate)",
};
const GEBIET_OPTS: Option[] = ARBEITSGEBIETE.map((g) => ({
  key: ARBEITSGEBIET_SLUG[g],
  label: ARBEITSGEBIET_LABEL[g],
  swatch: GEBIET_FARBE[g],
  icon: ARBEITSGEBIET_ICON[g],
}));

// Bewerbungsweg-Chip je Zeile: farbiges Symbol + Text. Farbe/Label aus der
// geteilten Quelle (lib/stellen-filter), Icon je Weg — identisch zur
// Versandfertig-Seite.
const WEG_ICON: Record<string, typeof Mail> = {
  email: Mail,
  portal: Globe,
  formular: FileText,
  ungeklaert: CircleHelp,
  tot: CircleSlash,
};
function wegInfo(kanal: string | null): { label: string; Icon: typeof Mail; color: string } {
  const w = bewerbungsweg(kanal);
  return { label: WEG_LABEL[w], Icon: WEG_ICON[w], color: WEG_FARBE[w] };
}

// Status-Chip semantisch eingefärbt (Farbe + Punkt + getönter Hintergrund),
// nach echtem DB-Status. Jeder Wert klar unterscheidbar; Unbekanntes neutral.
function statusInfo(status: string | null): { label: string; color: string } {
  switch (status) {
    case "neu":
      return { label: "Neu", color: "#6b7280" }; // grau
    case "bewertet":
      return { label: "Bewertet", color: "#0a6cd4" }; // blau
    case "nachbewertet":
      return { label: "Nachbewertet", color: "#3b82f6" }; // helleres blau
    case "shortlist":
      return { label: "Shortlist", color: "#0891b2" }; // cyan
    case "anschreiben_erstellt":
      return { label: "Versandfertig", color: "#22c55e" }; // hellgrün
    case "anschreiben_manuell":
      return { label: "Anschreiben manuell", color: "#0f8f8a" }; // teal
    case "versendet":
      return { label: "Beworben", color: "#1d9d52" }; // grün mittel
    case "zugestellt":
      return { label: "Zugestellt", color: "#15803d" }; // dunkelgrün
    case "rueckmeldung":
      return { label: "Rückmeldung", color: "#7c3aed" }; // violett
    case "unzustellbar":
      return { label: "Unzustellbar", color: "#e3811b" }; // orange
    case "tot":
      return { label: "Tot", color: "#dc2626" }; // rot
    case "aussortiert":
      return { label: "Aussortiert", color: "#94a3b8" }; // slate
    case "abgelaufen":
      return { label: "Abgelaufen", color: "#475569" }; // slate-600, dunkler als aussortiert
    case "fehler":
      return { label: "Fehler", color: "#991b1b" }; // dunkelrot
    default:
      return { label: status ?? "Unbekannt", color: "#64748b" };
  }
}

interface Zeile {
  stelle: StellenListeZeile;
  statusGrp: string | null;
  gebietSlug: string;
  kanalGrp: string;
}

function toggleInSet(s: Set<string>, key: string): Set<string> {
  const next = new Set(s);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function StellenTabelle({
  stellen,
  start,
  heute,
  friedhof = false,
  abgelaufenCount = 0,
}: {
  stellen: StellenListeZeile[];
  start: StellenStart;
  heute: string; // Anker-Tag (YYYY-MM-DD, Europe/Berlin) vom Server
  friedhof?: boolean; // Server-Modus: Liste zeigt nur status='abgelaufen'
  abgelaufenCount?: number; // Live-Anzahl abgelaufener Stellen (Friedhof-Badge)
}) {
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set(start.status));
  const [quelleSel, setQuelleSel] = useState<Set<string>>(new Set(start.quelle));
  const [gebietSel, setGebietSel] = useState<Set<string>>(new Set(start.gebiet));
  const [kanalSel, setKanalSel] = useState<Set<string>>(new Set(start.kanal));
  const [arbeitgeber, setArbeitgeber] = useState<ArbeitgeberWahl>(start.arbeitgeber);
  const [eingetroffen, setEingetroffen] = useState<EingetroffenWahl>(start.eingetroffen);
  const [minScore, setMinScore] = useState(start.minScore);
  const [maxScore, setMaxScore] = useState(start.maxScore);
  const [tag, setTag] = useState(start.tag);
  const [suche, setSuche] = useState(start.suche);
  const [offen, setOffen] = useState<
    "status" | "quelle" | "gebiet" | "kanal" | "arbeitgeber" | "eingetroffen" | "sort" | null
  >(null);

  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  const sucheRef = useRef<HTMLInputElement>(null);

  // Offene Facette per Außenklick schließen.
  useEffect(() => {
    if (!offen) return;
    const zu = () => setOffen(null);
    document.addEventListener("click", zu);
    return () => document.removeEventListener("click", zu);
  }, [offen]);

  // ⌘K / Strg+K fokussiert das Seiten-Suchfeld (Topbar-Suche ist auf /stellen aus).
  useEffect(() => {
    const aufTaste = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        sucheRef.current?.focus();
      }
    };
    document.addEventListener("keydown", aufTaste);
    return () => document.removeEventListener("keydown", aufTaste);
  }, []);

  const resetSeite = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const { zeilen, statusZ, quelleZ, gebietZ, kanalZ } = useMemo(() => {
    const z: Zeile[] = stellen.map((s) => ({
      stelle: s,
      statusGrp: stellenStatusGruppe(s.status),
      gebietSlug: ARBEITSGEBIET_SLUG[parseArbeitsgebiet(s.arbeitsgebiet)],
      kanalGrp: kanalGruppe(s.bewerbungskanal),
    }));
    const inc = (m: Map<string, number>, k: string | null) => {
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    };
    const sZ = new Map<string, number>();
    const qZ = new Map<string, number>();
    const gZ = new Map<string, number>();
    const kZ = new Map<string, number>();
    for (const e of z) {
      inc(sZ, e.statusGrp);
      inc(qZ, e.stelle.quelle);
      inc(gZ, e.gebietSlug);
      inc(kZ, e.kanalGrp);
    }
    return { zeilen: z, statusZ: sZ, quelleZ: qZ, gebietZ: gZ, kanalZ: kZ };
  }, [stellen]);

  // Bewerbungsweg-Optionen: nur tatsächlich vorhandene Werte zeigen.
  const kanalOpts = useMemo(() => KANAL_OPTS.filter((o) => (kanalZ.get(o.key) ?? 0) > 0), [kanalZ]);

  // Untergrenze (inklusiv) je Datums-Fenster, vom Server-Anker abgeleitet.
  // 7 Tage = {heute-6 … heute} (= dasselbe Fenster wie der Nachschub-Chart).
  const eingAb = useMemo(
    () => (eingetroffen === "7" ? tageZurueck(heute, 6) : eingetroffen === "14" ? tageZurueck(heute, 13) : null),
    [eingetroffen, heute]
  );

  const sucheNorm = suche.trim().toLowerCase();
  const gefiltert = useMemo(
    () =>
      zeilen.filter((e) => {
        if (statusSel.size > 0 && (!e.statusGrp || !statusSel.has(e.statusGrp))) return false;
        if (quelleSel.size > 0 && (!e.stelle.quelle || !quelleSel.has(e.stelle.quelle))) return false;
        if (gebietSel.size > 0 && !gebietSel.has(e.gebietSlug)) return false;
        if (kanalSel.size > 0 && !kanalSel.has(e.kanalGrp)) return false;
        if (arbeitgeber === "vermittler" && e.stelle.ist_vermittler !== true) return false;
        if (arbeitgeber === "direkt" && e.stelle.ist_vermittler === true) return false;
        if (eingetroffen !== "alle") {
          const t = e.stelle.eingetroffen;
          if (!t) return false;
          // "Heute" = exakt der heutige Berlin-Kalendertag; Fenster sonst [eingAb, heute].
          if (eingetroffen === "heute") {
            if (t !== heute) return false;
          } else if (t < (eingAb as string) || t > heute) {
            return false;
          }
        }
        // Exakter Eingetroffen-Tag (Nachschub-Datum-Deep-Link).
        if (tag && e.stelle.eingetroffen !== tag) return false;
        if (minScore > 0 && (e.stelle.score ?? -1) < minScore) return false;
        // Score-Obergrenze (Histogramm-Band wie 80–89): null-Scores fallen raus.
        if (maxScore > 0 && (e.stelle.score == null || e.stelle.score > maxScore)) return false;
        if (sucheNorm) {
          const hay =
            `${e.stelle.titel ?? ""} ${e.stelle.arbeitgeber ?? ""} ${e.stelle.ort ?? ""}`.toLowerCase();
          if (!hay.includes(sucheNorm)) return false;
        }
        return true;
      }),
    [zeilen, statusSel, quelleSel, gebietSel, kanalSel, arbeitgeber, eingetroffen, eingAb, heute, tag, minScore, maxScore, sucheNorm]
  );

  const columns = useMemo<ColumnDef<Zeile>[]>(
    () => [
      { id: "score", accessorFn: (r) => r.stelle.score ?? -1 },
      { id: "titel", accessorFn: (r) => (r.stelle.titel ?? "").toLowerCase() },
      { id: "ort", accessorFn: (r) => (r.stelle.ort ?? "").toLowerCase() },
    ],
    []
  );

  const table = useReactTable({
    data: gefiltert,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const sortieren = (id: string) =>
    setSorting((prev) => {
      const cur = prev[0];
      if (cur?.id === id) return [{ id, desc: !cur.desc }];
      return [{ id, desc: id === "score" }];
    });
  const sortKlasse = (id: string) =>
    sorting[0]?.id === id ? (sorting[0].desc ? "desc" : "asc") : "";
  const sortFeldLabel =
    SORT_OPTS.find((o) => o.id === (sorting[0]?.id ?? "score"))?.label ?? "Score";

  const n = gefiltert.length;
  const { pageIndex, pageSize } = pagination;
  const von = n === 0 ? 0 : pageIndex * pageSize + 1;
  const bis = Math.min(n, (pageIndex + 1) * pageSize);
  const seiten = Math.max(1, table.getPageCount());

  const hatFilter =
    statusSel.size > 0 ||
    quelleSel.size > 0 ||
    gebietSel.size > 0 ||
    kanalSel.size > 0 ||
    arbeitgeber !== "alle" ||
    eingetroffen !== "alle" ||
    minScore > 0 ||
    maxScore > 0 ||
    tag !== "";

  const alleZuruecksetzen = () => {
    setStatusSel(new Set());
    setQuelleSel(new Set());
    setGebietSel(new Set());
    setKanalSel(new Set());
    setArbeitgeber("alle");
    setEingetroffen("alle");
    setMinScore(0);
    setMaxScore(0);
    setTag("");
    setSuche("");
    resetSeite();
    // Friedhof ist serverseitig (URL-Param) → beim Zurücksetzen zur aktiven Liste.
    if (friedhof) router.push("/stellen");
  };

  // Multi-Select-Menü mit "Alle" oben.
  const facetMenu = (
    opts: Option[],
    sel: Set<string>,
    setSel: (s: Set<string>) => void,
    zaehler: Map<string, number>
  ) => (
    <div className="facet-menu" onClick={(e) => e.stopPropagation()}>
      <div
        className={`fm-opt${sel.size === 0 ? " on" : ""}`}
        onClick={() => {
          setSel(new Set());
          resetSeite();
        }}
      >
        <span className="fm-box">
          <Check strokeWidth={3} />
        </span>
        <span className="fm-name">Alle</span>
      </div>
      {opts.map((o) => (
        <div
          key={o.key}
          className={`fm-opt${sel.has(o.key) ? " on" : ""}`}
          onClick={() => {
            setSel(toggleInSet(sel, o.key));
            resetSeite();
          }}
        >
          <span className="fm-box">
            <Check strokeWidth={3} />
          </span>
          {o.icon ? (
            <span className="asset-ico" style={{ backgroundImage: `url(${o.icon})` }} />
          ) : o.swatch ? (
            <span className="fm-swatch" style={{ background: o.swatch }} />
          ) : null}
          <span className="fm-name">{o.label}</span>
          <span className="fm-num num">{zaehler.get(o.key) ?? 0}</span>
        </div>
      ))}
    </div>
  );

  const facetBtn = (
    key: "status" | "quelle" | "gebiet" | "kanal",
    icon: React.ReactNode,
    label: string,
    sel: Set<string>
  ) => (
    <button
      className="facet"
      onClick={(e) => {
        e.stopPropagation();
        setOffen(offen === key ? null : key);
      }}
    >
      {icon}
      {label}
      {sel.size > 0 && <span className="fcount num">{sel.size}</span>}
      <ChevronDown className="chev" strokeWidth={2.5} />
    </button>
  );

  const pillListe: { id: string; label: string; weg: () => void }[] = [
    ...[...statusSel].map((k) => ({
      id: `s-${k}`,
      label: `Status: ${STATUS_OPTS.find((o) => o.key === k)?.label ?? k}`,
      weg: () => {
        setStatusSel(toggleInSet(statusSel, k));
        resetSeite();
      },
    })),
    ...[...quelleSel].map((k) => ({
      id: `q-${k}`,
      label: `Quelle: ${QUELLE_OPTS.find((o) => o.key === k)?.label ?? k}`,
      weg: () => {
        setQuelleSel(toggleInSet(quelleSel, k));
        resetSeite();
      },
    })),
    ...[...gebietSel].map((k) => ({
      id: `g-${k}`,
      label: `Gebiet: ${GEBIET_OPTS.find((o) => o.key === k)?.label ?? k}`,
      weg: () => {
        setGebietSel(toggleInSet(gebietSel, k));
        resetSeite();
      },
    })),
    ...[...kanalSel].map((k) => ({
      id: `k-${k}`,
      label: `Weg: ${KANAL_OPTS.find((o) => o.key === k)?.label ?? k}`,
      weg: () => {
        setKanalSel(toggleInSet(kanalSel, k));
        resetSeite();
      },
    })),
    ...(arbeitgeber !== "alle"
      ? [
          {
            id: "arb",
            label: ARBEITGEBER_OPTS.find((o) => o.key === arbeitgeber)?.label ?? arbeitgeber,
            weg: () => setArbeitgeber("alle"),
          },
        ]
      : []),
    ...(eingetroffen !== "alle"
      ? [
          {
            id: "eing",
            label: `Eingetroffen: ${EINGETROFFEN_OPTS.find((o) => o.key === eingetroffen)?.label ?? eingetroffen}`,
            weg: () => {
              setEingetroffen("alle");
              resetSeite();
            },
          },
        ]
      : []),
    ...(minScore > 0 || maxScore > 0
      ? [
          {
            id: "score",
            label:
              minScore > 0 && maxScore > 0
                ? `Score ${minScore}–${maxScore}`
                : minScore > 0
                  ? `Score ≥ ${minScore}`
                  : `Score ≤ ${maxScore}`,
            weg: () => {
              setMinScore(0);
              setMaxScore(0);
              resetSeite();
            },
          },
        ]
      : []),
    ...(tag !== ""
      ? [
          {
            id: "tag",
            label: `Eingetroffen: ${tag.slice(8, 10)}.${tag.slice(5, 7)}.`,
            weg: () => {
              setTag("");
              resetSeite();
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="filterbar">
        <div className="fb-search">
          <Search strokeWidth={2} />
          <input
            ref={sucheRef}
            placeholder="Titel, Firma oder Ort…"
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value);
              resetSeite();
            }}
          />
        </div>

        <div className={`facet-wrap${offen === "status" ? " open" : ""}`}>
          {facetBtn("status", <CircleCheckBig className="fi" strokeWidth={2} />, "Status", statusSel)}
          {facetMenu(STATUS_OPTS, statusSel, setStatusSel, statusZ)}
        </div>

        <div className={`facet-wrap${offen === "quelle" ? " open" : ""}`}>
          {facetBtn("quelle", <List className="fi" strokeWidth={2} />, "Quelle", quelleSel)}
          {facetMenu(QUELLE_OPTS, quelleSel, setQuelleSel, quelleZ)}
        </div>

        <div className={`facet-wrap${offen === "kanal" ? " open" : ""}`}>
          {facetBtn("kanal", <Mail className="fi" strokeWidth={2} />, "Bewerbungsweg", kanalSel)}
          {facetMenu(kanalOpts, kanalSel, setKanalSel, kanalZ)}
        </div>

        <div className={`facet-wrap${offen === "gebiet" ? " open" : ""}`}>
          {facetBtn("gebiet", <Boxes className="fi" strokeWidth={2} />, "Arbeitsgebiet", gebietSel)}
          {facetMenu(GEBIET_OPTS, gebietSel, setGebietSel, gebietZ)}
        </div>

        <div className={`facet-wrap${offen === "arbeitgeber" ? " open" : ""}`}>
          <button
            className="facet"
            onClick={(e) => {
              e.stopPropagation();
              setOffen(offen === "arbeitgeber" ? null : "arbeitgeber");
            }}
          >
            <Users className="fi" strokeWidth={2} />
            Arbeitgeber
            {arbeitgeber !== "alle" && <span className="fcount num">1</span>}
            <ChevronDown className="chev" strokeWidth={2.5} />
          </button>
          <div className="facet-menu" onClick={(e) => e.stopPropagation()}>
            {ARBEITGEBER_OPTS.map((o) => (
              <div
                key={o.key}
                className={`fm-opt${arbeitgeber === o.key ? " on" : ""}`}
                onClick={() => {
                  setArbeitgeber(o.key as ArbeitgeberWahl);
                  resetSeite();
                }}
              >
                <span className="fm-box">
                  <Check strokeWidth={3} />
                </span>
                <span className="fm-name">{o.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`facet-wrap${offen === "eingetroffen" ? " open" : ""}`}>
          <button
            className="facet"
            onClick={(e) => {
              e.stopPropagation();
              setOffen(offen === "eingetroffen" ? null : "eingetroffen");
            }}
          >
            <CalendarDays className="fi" strokeWidth={2} />
            Eingetroffen
            {eingetroffen !== "alle" && <span className="fcount num">1</span>}
            <ChevronDown className="chev" strokeWidth={2.5} />
          </button>
          <div className="facet-menu" onClick={(e) => e.stopPropagation()}>
            {EINGETROFFEN_OPTS.map((o) => (
              <div
                key={o.key}
                className={`fm-opt${eingetroffen === o.key ? " on" : ""}`}
                onClick={() => {
                  setEingetroffen(o.key);
                  resetSeite();
                }}
              >
                <span className="fm-box">
                  <Check strokeWidth={3} />
                </span>
                <span className="fm-name">{o.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          className={`facet friedhof-btn${friedhof ? " on" : ""}`}
          title={friedhof ? "Zurück zur aktiven Liste" : "Abgelaufene Stellen anzeigen"}
          onClick={() => router.push(friedhof ? "/stellen" : "/stellen?friedhof=1")}
        >
          <Skull className="fi" strokeWidth={2} />
          Job-Friedhof
          {abgelaufenCount > 0 && <span className="fcount num">{abgelaufenCount}</span>}
        </button>

        <button className="reset-link" onClick={alleZuruecksetzen}>
          Filter zurücksetzen
        </button>
      </div>

      {hatFilter && (
        <div className="pills">
          <span className="pills-label">Aktiv:</span>
          {pillListe.map((p) => (
            <span className="pill" key={p.id}>
              {p.label}
              <button onClick={p.weg} aria-label={`${p.label} entfernen`}>
                <X strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="table-card">
        <div className="table-tools">
          <span className="tt-count">
            Zeige <b className="num">{von}–{bis}</b> von <b className="num">{n}</b> Stellen
          </span>
          <div className="tt-right">
            <div className={`facet-wrap tt-sort${offen === "sort" ? " open" : ""}`}>
              <button
                className="tt-select"
                onClick={(e) => {
                  e.stopPropagation();
                  setOffen(offen === "sort" ? null : "sort");
                }}
              >
                <ArrowDownUp strokeWidth={2} />
                Sortierung: {sortFeldLabel}
                <ChevronDown className="chev" strokeWidth={2.5} />
              </button>
              <div className="facet-menu" onClick={(e) => e.stopPropagation()}>
                {SORT_OPTS.map((o) => {
                  const aktiv = (sorting[0]?.id ?? "score") === o.id;
                  return (
                    <div
                      key={o.id}
                      className={`fm-opt${aktiv ? " on" : ""}`}
                      onClick={() => sortieren(o.id)}
                    >
                      <span className="fm-name">{o.label}</span>
                      {aktiv && (
                        <ChevronDown
                          className={`sm-dir${sorting[0]?.desc ? " desc" : " asc"}`}
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th className="th-c">
                <span className={`th-sort ${sortKlasse("score")}`} onClick={() => sortieren("score")}>
                  Score
                  <ChevronDown className="arr" strokeWidth={2.5} />
                </span>
              </th>
              <th>
                <span className={`th-sort ${sortKlasse("titel")}`} onClick={() => sortieren("titel")}>
                  Stelle
                  <ChevronDown className="arr" strokeWidth={2.5} />
                </span>
              </th>
              <th>Arbeitsgebiet</th>
              <th>
                <span className={`th-sort ${sortKlasse("ort")}`} onClick={() => sortieren("ort")}>
                  Ort
                  <ChevronDown className="arr" strokeWidth={2.5} />
                </span>
              </th>
              <th>Quelle</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const s = row.original.stelle;
              const gebiet = parseArbeitsgebiet(s.arbeitsgebiet);
              const stat = statusInfo(s.status);
              const weg = wegInfo(s.bewerbungskanal);
              const WegIcon = weg.Icon;
              const detail = `/stelle/${encodeURIComponent(s.refnr)}`;
              return (
                <tr
                  key={s.refnr}
                  className="row-link"
                  onClick={() => router.push(detail)}
                >
                  <td data-label="Score">
                    <div className={`score-pill ${(s.score ?? 0) >= 85 ? "hi" : "mid"} num`}>
                      {s.score ?? "—"}
                    </div>
                  </td>
                  <td data-label="Stelle">
                    <div className="cell-title">
                      <div className="ct-row">
                        <Link
                          href={detail}
                          className="ct-name"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.titel ?? "Ohne Titel"}
                        </Link>
                        {s.ist_vermittler === true && (
                          <span className="ct-verm" title="Personalvermittler">
                            <Users strokeWidth={2} />
                          </span>
                        )}
                      </div>
                      <span className="ct-co">{s.arbeitgeber ?? "Unbekannt"}</span>
                      <span
                        className="weg"
                        style={{
                          color: weg.color,
                          background: `color-mix(in srgb, ${weg.color} 13%, transparent)`,
                        }}
                        title={`Bewerbungsweg: ${weg.label}`}
                      >
                        <WegIcon strokeWidth={2} />
                        {weg.label}
                      </span>
                    </div>
                  </td>
                  <td data-label="Gebiet">
                    <span className="tag">
                      {ARBEITSGEBIET_ICON[gebiet] ? (
                        <span
                          className="asset-ico"
                          style={{ backgroundImage: `url(${ARBEITSGEBIET_ICON[gebiet]})` }}
                        />
                      ) : (
                        <span className="tdot" style={{ background: GEBIET_FARBE[gebiet] }} />
                      )}
                      {ARBEITSGEBIET_LABEL[gebiet]}
                    </span>
                  </td>
                  <td data-label="Ort">
                    {s.homeoffice === true ? (
                      <span className="loc remote">
                        <Globe strokeWidth={2} />
                        Remote
                      </span>
                    ) : s.ort ? (
                      <span className="loc">
                        <MapPin strokeWidth={2} />
                        {s.ort}
                      </span>
                    ) : (
                      <span className="loc" style={{ color: "var(--fg-subtle)" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td data-label="Quelle">
                    {s.quelle === "bundesagentur" ? (
                      <span className="chip ba">
                        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/ba.svg)" }} />
                        BA
                      </span>
                    ) : s.quelle === "adzuna" ? (
                      <span className="chip adzuna">
                        <span className="asset-ico" style={{ backgroundImage: "url(/quellen/adzuna.svg)" }} />
                        Adzuna
                      </span>
                    ) : s.quelle === "manuell" ? (
                      <span className="chip">Manuell</span>
                    ) : (
                      <span className="chip">{s.quelle ?? "?"}</span>
                    )}
                  </td>
                  <td data-label="Status">
                    <span
                      className="badge"
                      style={{
                        color: stat.color,
                        background: `color-mix(in srgb, ${stat.color} 13%, transparent)`,
                      }}
                    >
                      <span className="bdot" style={{ background: stat.color }} />
                      {stat.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {n === 0 && (
              <tr>
                <td
                  data-label="Hinweis"
                  colSpan={6}
                  style={{ textAlign: "center", color: "var(--fg-muted)", padding: "28px 14px" }}
                >
                  Keine Stellen für diese Filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pager">
          <div className="pg-rows">
            Zeilen pro Seite
            <button
              className="pg-select"
              onClick={() =>
                setPagination((p) => ({
                  pageIndex: 0,
                  pageSize: p.pageSize === 25 ? 50 : p.pageSize === 50 ? 100 : 25,
                }))
              }
            >
              {pageSize}
              <ChevronDown strokeWidth={2.5} />
            </button>
          </div>
          <span className="pg-info">
            Seite {pageIndex + 1} von {seiten} · {n} Stellen
          </span>
          <div className="pg-btns">
            <button
              className="pg-btn"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label="Vorige Seite"
            >
              <ChevronLeft strokeWidth={2.5} />
            </button>
            <button
              className="pg-btn"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label="Nächste Seite"
            >
              <ChevronRight strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
