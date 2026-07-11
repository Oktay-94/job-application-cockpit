import Link from "next/link";
import { CalendarX } from "lucide-react";
import { getAbgelaufeneStellen } from "@/lib/stellen";

export const dynamic = "force-dynamic";

// "DD.MM.YYYY HH:MM" aus dem server-seitig (Europe/Berlin) gelieferten
// "YYYY-MM-DDTHH:MM" — kein Client-Date, daher kein Hydration-Mismatch.
function abgelaufenText(iso: string | null): string {
  if (!iso) return "—";
  const [datum, zeit] = iso.split("T");
  const [j, m, t] = datum.split("-");
  return `${t}.${m}.${j}${zeit ? ` · ${zeit}` : ""}`;
}

function quelleLabel(quelle: string | null): string {
  if (quelle === "bundesagentur") return "Arbeitsagentur";
  if (quelle === "adzuna") return "Adzuna";
  return quelle ?? "—";
}

// Eigener Bereich für vom Frische-Wächter als tot markierte Stellen. Bewusst
// getrennt von der Hauptliste (die schließt 'abgelaufen' aus) — hier bleiben
// sie sichtbar, klar als abgelaufen markiert, read-only.
export default async function AbgelaufenSeite() {
  const stellen = await getAbgelaufeneStellen();

  return (
    <>
      <div className="ctxbar">
        <span className="ctx-big">
          <b className="num">{stellen.length}</b> abgelaufen
        </span>
        <span className="ctx-note">
          <CalendarX strokeWidth={2} />
          Anzeige offline · vom Frische-Wächter erkannt · aus der aktiven Pipeline genommen
        </span>
      </div>

      {stellen.length === 0 ? (
        <p style={{ padding: "24px 14px", color: "var(--fg-muted)" }}>
          Keine abgelaufenen Stellen — die Warteschlange ist frisch.
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Stelle</th>
              <th>Arbeitgeber</th>
              <th>Ort</th>
              <th>Quelle</th>
              <th className="th-c">Score</th>
              <th>Abgelaufen am</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stellen.map((s) => (
              <tr key={s.refnr}>
                <td>
                  <Link href={`/stelle/${encodeURIComponent(s.refnr)}`} className="row-link">
                    {s.titel ?? s.refnr}
                  </Link>
                </td>
                <td>{s.arbeitgeber ?? "—"}</td>
                <td>{s.ort ?? "—"}</td>
                <td>{quelleLabel(s.quelle)}</td>
                <td className="th-c num">{s.score ?? "—"}</td>
                <td className="num">{abgelaufenText(s.abgelaufen_am)}</td>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 99,
                        background: "#475569",
                      }}
                    />
                    Abgelaufen
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
