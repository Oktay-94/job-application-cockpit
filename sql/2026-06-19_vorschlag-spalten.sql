-- ============================================================
-- Sammel-Migration (19.06.2026): Vorschlag-Spalten
--   - Rückmeldungen: Fuzzy-Match-Vorschlag persistieren (Cockpit „Zu bestätigen")
--   - Erkundung: Beschreibungs-Vorschlag des Agenten vor Übernahme
-- + column-level GRANTs für die Cockpit-Schreibrouten (Rolle chatbot_leser).
--
-- Ausführen als DB-Owner/Superuser (NICHT als chatbot_leser):
--   psql "$DATABASE_URL_ADMIN" -f sql/2026-06-19_vorschlag-spalten.sql
-- Idempotent (IF NOT EXISTS + idempotente GRANTs) — gefahrlos mehrfach ausführbar.
-- ============================================================

-- 1) Neue Spalten ------------------------------------------------
ALTER TABLE stellen
  ADD COLUMN IF NOT EXISTS rueckmeldung_vorschlag    jsonb,        -- Fuzzy-Match-Vorschlag des Trackers: {kategorie, gespraech_am, gespraech_ort, zusammenfassung, confidence, quelle, von}
  ADD COLUMN IF NOT EXISTS rueckmeldung_vorschlag_am timestamptz,  -- wann der Vorschlag eintrug
  ADD COLUMN IF NOT EXISTS erkundung_vorschlag       text,         -- Beschreibungs-Vorschlag des Agenten VOR Übernahme
  ADD COLUMN IF NOT EXISTS erkundung_vorschlag_am    timestamptz;  -- wann erkundet

-- 2) GRANTs: chatbot_leser (Cockpit) darf GENAU diese Spalten schreiben.
--    SELECT ist bereits tabellenweit gewährt → für die neuen Spalten kein extra SELECT nötig.
--    scout_fund_email/_quelle haben UPDATE schon → hier nicht wiederholt.
GRANT UPDATE (
  beschreibung,                  -- Erkundung-Übernehmen: Vorschlag → beschreibung
  rueckmeldung,                  -- Rückmeldung-Übernehmen: Kategorie (absage|zusage|einladung|eingangsbestaetigung)
  rueckmeldung_am,
  rueckmeldung_zusammenfassung,
  gespraech_am,
  gespraech_ort,
  rueckmeldung_vorschlag,        -- Übernehmen/Verwerfen löscht; n8n-Tracker befüllt
  rueckmeldung_vorschlag_am,
  erkundung_vorschlag,           -- Erkundungs-Fund schreibt; Übernehmen/Verwerfen löscht
  erkundung_vorschlag_am
) ON stellen TO chatbot_leser;
