import pool from "@/lib/db";

// Badge-Zahlen für die Sidebar. Liest dieselbe Population wie die Stellen-Liste
// (ohne aussortiert/fehler) bzw. den Versandfertig-Status. "rueckmeldungen" =
// offene Fuzzy-Vorschläge ("Zu bestätigen"), die auf eine Entscheidung warten.
export interface NavZahlen {
  stellen: number;
  versandfertig: number;
  rueckmeldungen: number | null;
}

export async function getNavZahlen(): Promise<NavZahlen> {
  try {
    const { rows } = await pool.query<{
      stellen: string;
      versandfertig: string;
      rueckmeldungen: string;
    }>(
      `SELECT
         count(*) FILTER (WHERE status NOT IN ('aussortiert', 'fehler')) AS stellen,
         count(*) FILTER (WHERE status = 'anschreiben_erstellt') AS versandfertig,
         count(*) FILTER (WHERE rueckmeldung_vorschlag IS NOT NULL) AS rueckmeldungen
       FROM stellen`
    );
    const r = rows[0];
    return {
      stellen: Number(r.stellen),
      versandfertig: Number(r.versandfertig),
      rueckmeldungen: Number(r.rueckmeldungen),
    };
  } catch {
    // Shell darf nie an einem DB-Hänger sterben — dann eben ohne Badges.
    return { stellen: 0, versandfertig: 0, rueckmeldungen: null };
  }
}
