-- Schema for the two tables the app uses (dumped schema-only, cleaned).
-- Apply with: psql "$DATABASE_URL" -f sql/schema.sql

CREATE TABLE public.bewerber_profil (
    schluessel text NOT NULL,
    wert text NOT NULL
);

CREATE TABLE public.stellen (
    id integer NOT NULL,
    refnr text NOT NULL,
    titel text,
    beruf text,
    arbeitgeber text,
    ort text,
    plz text,
    entfernung integer,
    homeoffice boolean DEFAULT false,
    veroeffentlicht date,
    eintrittsdatum date,
    externe_url text,
    quelle text DEFAULT 'bundesagentur'::text,
    status text DEFAULT 'neu'::text,
    score integer,
    score_text text,
    anschreiben text,
    erstellt_am timestamp without time zone DEFAULT now(),
    score_richtung text,
    bewertet_am timestamp with time zone,
    beschreibung text,
    bewerbung_email text,
    versendet_am timestamp with time zone,
    bewerbungskanal text,
    formular_url text,
    ist_vermittler boolean,
    scout_geprueft_am timestamp with time zone,
    scout_fund_email text,
    scout_fund_quelle text,
    arbeitsgebiet text,
    rueckmeldung text,
    rueckmeldung_am timestamp with time zone,
    gespraech_am timestamp with time zone,
    gespraech_ort text,
    rueckmeldung_zusammenfassung text,
    sent_message_id text,
    notiz text,
    anschreiben_gestartet_am timestamp without time zone,
    rueckmeldung_vorschlag jsonb,
    rueckmeldung_vorschlag_am timestamp with time zone,
    abgelaufen_am timestamp with time zone,
    erkundung_vorschlag text,
    erkundung_vorschlag_am timestamp with time zone,
    CONSTRAINT stellen_bewerbungskanal_check CHECK ((bewerbungskanal = ANY (ARRAY['email'::text, 'formular'::text, 'portal'::text, 'tot'::text])))
);

CREATE SEQUENCE public.stellen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.stellen_id_seq OWNED BY public.stellen.id;

ALTER TABLE ONLY public.stellen ALTER COLUMN id SET DEFAULT nextval('public.stellen_id_seq'::regclass);

ALTER TABLE ONLY public.bewerber_profil
    ADD CONSTRAINT bewerber_profil_pkey PRIMARY KEY (schluessel);

ALTER TABLE ONLY public.stellen
    ADD CONSTRAINT stellen_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stellen
    ADD CONSTRAINT stellen_refnr_key UNIQUE (refnr);
