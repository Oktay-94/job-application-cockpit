-- Demo seed data: entirely fictional companies, jobs, and applicant profile.
-- Covers every pipeline state the UI knows so all views render with content.
-- Apply after sql/schema.sql: psql "$DATABASE_URL" -f sql/seed-demo.sql

-- Applicant master data (fictional)
INSERT INTO bewerber_profil (schluessel, wert) VALUES
  ('vorname', 'Max'),
  ('nachname', 'Mustermann'),
  ('email', 'max.mustermann@example.com'),
  ('telefon', '+49 711 0000000'),
  ('strasse', 'Musterstraße 1'),
  ('plz', '70000'),
  ('ort', 'Musterstadt'),
  ('verfuegbar_ab', 'ab sofort'),
  ('arbeitszeit', 'Vollzeit'),
  ('fuehrerschein', 'Klasse B'),
  ('berufsabschluss', 'Fachinformatiker Anwendungsentwicklung (IHK)'),
  ('deutsch_niveau', 'Muttersprache'),
  ('englisch_niveau', 'B2');

-- Jobs across all pipeline states
INSERT INTO stellen
  (refnr, titel, beruf, arbeitgeber, ort, plz, entfernung, homeoffice, veroeffentlicht,
   quelle, status, score, score_text, arbeitsgebiet, beschreibung, bewerbungskanal,
   bewerbung_email, anschreiben, erstellt_am, bewertet_am, versendet_am,
   rueckmeldung, rueckmeldung_am, gespraech_am, gespraech_ort, notiz, ist_vermittler, abgelaufen_am)
VALUES
  -- status = neu (frisch eingesammelt, noch unbewertet)
  ('DEMO-10001', 'Junior Softwareentwickler C#/.NET (m/w/d)', 'Softwareentwickler', 'Nordwind Software GmbH', 'Musterstadt', '70000', 8, true, '2026-07-06',
   'bundesagentur', 'neu', NULL, NULL, 'Anwendungsentwicklung', 'Wir suchen Verstärkung für unser Produktteam. Sie entwickeln Features in C#/.NET, schreiben Tests und arbeiten eng mit dem Support zusammen.', NULL,
   NULL, NULL, '2026-07-08 09:15:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL),
  ('DEMO-10002', 'IT-Systemadministrator (m/w/d)', 'Systemadministrator', 'Pixelpark Systems AG', 'Beispielheim', '71000', 15, false, '2026-07-05',
   'adzuna', 'neu', NULL, NULL, 'Systemintegration', 'Betreuung unserer Windows- und Linux-Serverlandschaft, Benutzerverwaltung, Patch-Management und Mitarbeit an Cloud-Migrationsprojekten.', NULL,
   NULL, NULL, '2026-07-08 09:15:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL),

  -- status = neu mit Score (bewertet, noch kein Anschreiben)
  ('DEMO-10003', 'Junior Cloud Engineer AWS (m/w/d)', 'Cloud Engineer', 'Wolkenschmiede IT GmbH', 'Musterstadt', '70000', 5, true, '2026-07-03',
   'bundesagentur', 'neu', 88, 'Sehr gute Passung: AWS-Fokus, Junior-Level, Weiterbildungsbudget erwähnt.', 'Cloud/DevOps', 'Aufbau und Betrieb von AWS-Infrastruktur mit Terraform, CI/CD-Pipelines und Monitoring. Junior-Bewerber ausdrücklich willkommen.', NULL,
   NULL, NULL, '2026-07-05 08:30:00', '2026-07-05 09:00:00', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL),
  ('DEMO-10004', 'Fullstack-Entwickler TypeScript (m/w/d)', 'Softwareentwickler', 'Datenwerk Beispiel GmbH', 'Beispelfingen', '72000', 22, true, '2026-07-02',
   'adzuna', 'neu', 74, 'Gute Passung: TypeScript/React-Stack, hybrides Arbeiten.', 'Anwendungsentwicklung', 'Entwicklung unserer Kundenportale mit React, Node.js und PostgreSQL in einem sechsköpfigen Team.', NULL,
   NULL, NULL, '2026-07-04 08:30:00', '2026-07-04 09:10:00', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL),
  ('DEMO-10005', 'IT-Consultant Personaldienstleistung (m/w/d)', 'IT-Consultant', 'JobBrücke Personal GmbH', 'Musterstadt', '70000', 10, false, '2026-07-01',
   'bundesagentur', 'neu', 45, 'Mittlere Passung: Personaldienstleister, Einsatzort unklar.', 'Sonstiges', 'Wir vermitteln IT-Fachkräfte an Kundenunternehmen in der Region. Projekteinsätze wechselnd.', NULL,
   NULL, NULL, '2026-07-03 08:30:00', '2026-07-03 09:20:00', NULL, NULL, NULL, NULL, NULL, NULL, true, NULL),

  -- status = anschreiben_erstellt (versandfertig, Kanal E-Mail)
  ('DEMO-10006', 'Anwendungsentwickler PHP (m/w/d)', 'Softwareentwickler', 'Beispielwerk Digital GmbH', 'Musterstadt', '70000', 7, false, '2026-06-28',
   'bundesagentur', 'anschreiben_erstellt', 91, 'Sehr gute Passung: PHP 8, kleines Team, kurze Wege.', 'Anwendungsentwicklung', 'Weiterentwicklung unserer Warenwirtschaft (PHP 8, MySQL), saubere Architektur und Code-Reviews sind uns wichtig.', 'email',
   'jobs@beispielwerk-digital.example', 'Sehr geehrte Damen und Herren, mit großem Interesse habe ich Ihre Ausschreibung gelesen. Als ausgebildeter Fachinformatiker für Anwendungsentwicklung bringe ich praktische Erfahrung in PHP und MySQL mit. Über die Gelegenheit, mich persönlich vorzustellen, freue ich mich. Mit freundlichen Grüßen, Max Mustermann', '2026-06-30 10:00:00', '2026-06-30 10:30:00', NULL, NULL, NULL, NULL, NULL, 'Team wirkt sympathisch, Priorität hoch.', false, NULL),
  ('DEMO-10007', 'DevOps Engineer (m/w/d)', 'DevOps Engineer', 'Silberpfeil Software AG', 'Beispelfingen', '72000', 18, true, '2026-06-27',
   'adzuna', 'anschreiben_erstellt', 82, 'Gute Passung: Docker/Kubernetes, Remote-Anteil hoch.', 'Cloud/DevOps', 'Betrieb unserer Container-Plattform (Kubernetes), Ausbau der CI/CD-Strecken, Infrastructure as Code mit Terraform.', 'portal',
   NULL, 'Sehr geehrte Damen und Herren, Ihre Stelle als DevOps Engineer passt hervorragend zu meiner Weiterbildung im Cloud-Bereich. Gerne überzeuge ich Sie in einem persönlichen Gespräch. Mit freundlichen Grüßen, Max Mustermann', '2026-06-29 10:00:00', '2026-06-29 10:45:00', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL),

  -- status = versendet, noch ohne Rückmeldung
  ('DEMO-10008', 'IT-Support Specialist (m/w/d)', 'IT-Support', 'Grünfeld Logistik SE', 'Musterstadt', '70000', 12, false, '2026-06-20',
   'bundesagentur', 'versendet', 68, 'Gute Passung: 1st/2nd-Level, Einstieg gut möglich.', 'IT-Support', '1st- und 2nd-Level-Support für 400 Anwender, Ticketsystem, Hardware-Rollouts.', 'email',
   'bewerbung@gruenfeld-logistik.example', 'Sehr geehrte Damen und Herren, hiermit bewerbe ich mich auf die ausgeschriebene Stelle im IT-Support. Mit freundlichen Grüßen, Max Mustermann', '2026-06-22 09:00:00', '2026-06-22 09:30:00', '2026-06-24 14:12:00', NULL, NULL, NULL, NULL, NULL, false, NULL),
  ('DEMO-10009', 'Softwareentwickler Java (m/w/d)', 'Softwareentwickler', 'Adlerhorst Informatik GmbH', 'Beispielheim', '71000', 16, true, '2026-06-18',
   'adzuna', 'versendet', 79, 'Gute Passung: Java/Spring, strukturierte Einarbeitung.', 'Anwendungsentwicklung', 'Entwicklung von Backend-Services mit Java und Spring Boot für unsere Branchenlösung.', 'formular',
   NULL, 'Sehr geehrte Damen und Herren, über Ihr Bewerbungsformular reiche ich meine Unterlagen für die Java-Stelle ein. Mit freundlichen Grüßen, Max Mustermann', '2026-06-20 09:00:00', '2026-06-20 09:40:00', '2026-06-23 11:05:00', NULL, NULL, NULL, NULL, NULL, false, NULL),

  -- status = versendet + Rückmeldung: Einladung mit Gesprächstermin
  ('DEMO-10010', 'Junior Webentwickler (m/w/d)', 'Webentwickler', 'Morgenrot Medien GmbH', 'Musterstadt', '70000', 6, true, '2026-06-10',
   'bundesagentur', 'versendet', 85, 'Sehr gute Passung: modernes Frontend, Junior-freundlich.', 'Anwendungsentwicklung', 'Umsetzung von Weboberflächen mit React und TypeScript für Agenturkunden.', 'email',
   'karriere@morgenrot-medien.example', 'Sehr geehrte Damen und Herren, gerne bewerbe ich mich als Junior Webentwickler. Mit freundlichen Grüßen, Max Mustermann', '2026-06-12 09:00:00', '2026-06-12 09:30:00', '2026-06-14 10:00:00', 'einladung', '2026-07-01 15:20:00', '2026-07-15 10:00:00', 'Videocall (Teams)', 'Portfolio-Link im Gespräch zeigen.', false, NULL),
  -- status = versendet + Rückmeldung: Absage
  ('DEMO-10011', 'Systemintegrator Netzwerk (m/w/d)', 'Systemintegrator', 'Blaustein Netzwerke GmbH', 'Beispelfingen', '72000', 25, false, '2026-06-05',
   'bundesagentur', 'versendet', 62, 'Mittlere Passung: Netzwerk-Schwerpunkt, Zertifikate gefordert.', 'Systemintegration', 'Planung und Betrieb von Kundennetzwerken, Firewalls und VPN-Lösungen.', 'email',
   'jobs@blaustein-netzwerke.example', 'Sehr geehrte Damen und Herren, ich bewerbe mich auf die Stelle als Systemintegrator. Mit freundlichen Grüßen, Max Mustermann', '2026-06-07 09:00:00', '2026-06-07 09:30:00', '2026-06-09 08:45:00', 'absage', '2026-06-25 09:10:00', NULL, NULL, NULL, false, NULL),
  -- status = versendet + Rückmeldung: Zusage
  ('DEMO-10012', 'Fachinformatiker Anwendungsentwicklung (m/w/d)', 'Fachinformatiker', 'Sonnenhof IT Services GmbH', 'Musterstadt', '70000', 9, true, '2026-05-28',
   'bundesagentur', 'versendet', 93, 'Sehr gute Passung: exakt das Ausbildungsprofil.', 'Anwendungsentwicklung', 'Mitarbeit in unserem Entwicklungsteam für interne Tools und Kundenprojekte (C#, SQL).', 'email',
   'personal@sonnenhof-it.example', 'Sehr geehrte Damen und Herren, mit großer Freude bewerbe ich mich bei Ihnen. Mit freundlichen Grüßen, Max Mustermann', '2026-05-30 09:00:00', '2026-05-30 09:30:00', '2026-06-02 13:00:00', 'zusage', '2026-07-08 16:00:00', NULL, NULL, 'Vertragsentwurf kommt nächste Woche.', false, NULL),

  -- status = aussortiert
  ('DEMO-10013', 'SAP-Berater Senior (m/w/d)', 'SAP-Berater', 'Eichenblatt Consulting AG', 'Beispielheim', '71000', 30, false, '2026-06-15',
   'adzuna', 'aussortiert', 22, 'Geringe Passung: Senior-Level, 5+ Jahre SAP gefordert.', 'Sonstiges', 'Senior-Beratung für SAP S/4HANA-Einführungen, mehrjährige Projekterfahrung vorausgesetzt.', NULL,
   NULL, NULL, '2026-06-17 09:00:00', '2026-06-17 09:30:00', NULL, NULL, NULL, NULL, NULL, 'Zu senior, aussortiert.', false, NULL),

  -- status = abgelaufen
  ('DEMO-10014', 'Frontend-Entwickler Vue.js (m/w/d)', 'Webentwickler', 'Kupferberg Digital GmbH', 'Musterstadt', '70000', 11, true, '2026-05-10',
   'bundesagentur', 'abgelaufen', 77, 'Gute Passung, aber Anzeige offline.', 'Anwendungsentwicklung', 'Entwicklung von Single-Page-Anwendungen mit Vue.js für unser SaaS-Produkt.', NULL,
   NULL, NULL, '2026-05-12 09:00:00', '2026-05-12 09:30:00', NULL, NULL, NULL, NULL, NULL, NULL, false, '2026-06-28 07:00:00'),

  -- status = unzustellbar (Versand fehlgeschlagen)
  ('DEMO-10015', 'IT-Administrator Schulen (m/w/d)', 'Systemadministrator', 'Stadtverwaltung Musterstadt', 'Musterstadt', '70000', 4, false, '2026-06-12',
   'bundesagentur', 'unzustellbar', 71, 'Gute Passung: öffentlicher Dienst, planbare Zeiten.', 'Systemintegration', 'Betreuung der IT-Ausstattung an städtischen Schulen, Client-Management, Support für Lehrkräfte.', 'email',
   'it-bewerbung@musterstadt.example', 'Sehr geehrte Damen und Herren, ich bewerbe mich als IT-Administrator. Mit freundlichen Grüßen, Max Mustermann', '2026-06-14 09:00:00', '2026-06-14 09:30:00', '2026-06-16 10:30:00', NULL, NULL, NULL, NULL, 'Mailbox voll — Adresse prüfen.', false, NULL),

  -- quelle = manuell (über "Stelle aufnehmen" erfasst)
  ('DEMO-10016', 'Werkstudent Softwareentwicklung (m/w/d)', 'Softwareentwickler', 'Musterfirma GmbH', 'Beispielheim', '71000', 14, true, '2026-07-07',
   'manuell', 'neu', NULL, NULL, 'Anwendungsentwicklung', 'Auf der Firmenwebsite entdeckt: Unterstützung des Entwicklungsteams bei Tests und kleineren Features.', NULL,
   NULL, NULL, '2026-07-09 18:20:00', NULL, NULL, NULL, NULL, NULL, NULL, 'Über Firmenwebsite gefunden.', false, NULL);

-- Scout-Fund: eine versendbare Stelle mit gefundener Bewerbungs-E-Mail als Vorschlag
UPDATE stellen
SET scout_fund_email = 'recruiting@silberpfeil-software.example',
    scout_fund_quelle = 'impressum',
    scout_geprueft_am = '2026-07-01 06:00:00'
WHERE refnr = 'DEMO-10007';

-- Erkundungs-Vorschlag: eine Stelle mit erkundeter Beschreibung zur Prüfung
UPDATE stellen
SET erkundung_vorschlag = 'Erkundete Fassung: Das Team besteht aus acht Personen, eingesetzt werden C# und PostgreSQL. Homeoffice an zwei Tagen pro Woche möglich, Einarbeitung über ein Mentorenprogramm.',
    erkundung_vorschlag_am = '2026-07-09 12:00:00'
WHERE refnr = 'DEMO-10001';

-- Rückmeldungs-Vorschlag: automatisch erkannte Einladung wartet auf Bestätigung
UPDATE stellen
SET rueckmeldung_vorschlag = '{"art": "einladung", "gespraech_am": "2026-07-18T14:00:00+02:00", "gespraech_ort": "Vor Ort, Beispielheim", "zusammenfassung": "Einladung zum Kennenlerngespräch, Rückfrage zu Verfügbarkeit."}'::jsonb,
    rueckmeldung_vorschlag_am = '2026-07-10 08:30:00'
WHERE refnr = 'DEMO-10009';
