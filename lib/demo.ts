// Demo-Modus: blockt alle schreibenden API-Routen, damit eine öffentlich
// erreichbare Demo-Datenbank von Besuchern nicht verändert werden kann.
// Aktiv, wenn DEMO_MODE=true gesetzt ist ODER die n8n-Webhook-Variablen
// fehlen (kein echtes Automations-Backend angebunden). Lesende Routen
// laufen normal gegen die Seed-Daten.
export function istDemoModus(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  return !process.env.N8N_WEBHOOK_URL || !process.env.N8N_WEBHOOK_SECRET;
}

// Antwort im Format der übrigen Routen ({ ok, grund }): Der bestehende
// Fehlerpfad der Clients zeigt den Grund als Toast bzw. Inline-Meldung an.
export function demoAntwort(): Response {
  return Response.json({
    ok: false,
    demo: true,
    grund: "Demo-Modus – Aktion nicht ausgeführt.",
  });
}
