// Fires the "Manuelles Vollbündel" n8n webhook for a manually added job.
// The webhook responds immediately ("gestartet") and then runs Baustein 5 -> 7
// (Opus letter) -> 8 (CV) in the background. The ~4 ct Opus cost is scoped to
// this single refnr (the workflow hard-guards quelle='manuell'). Reuses the
// same secret as /api/aktion; the URL is derived from the cockpit-aktion URL by
// swapping the last path segment, so no extra env var is needed.

export interface BuendelErgebnis {
  ok: boolean;
  grund?: string;
  gestartet?: boolean;
}

export async function rufeBuendelWebhook(refnr: string): Promise<BuendelErgebnis> {
  const base = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!base || !secret) {
    console.error("N8N_WEBHOOK_URL/N8N_WEBHOOK_SECRET nicht konfiguriert");
    return { ok: false, grund: "Webhook nicht konfiguriert" };
  }
  const url = base.replace(/\/[^/]+$/, "/buendel-manuell");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Cockpit-Secret": secret },
      body: JSON.stringify({ refnr }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const antwort: unknown = await res.json().catch(() => null);
    if (
      typeof antwort !== "object" ||
      antwort === null ||
      typeof (antwort as { ok?: unknown }).ok !== "boolean"
    ) {
      return { ok: false, grund: `Unerwartete Antwort (HTTP ${res.status})` };
    }
    return antwort as BuendelErgebnis;
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    console.error("Bündel-Webhook fehlgeschlagen:", timeout ? "Timeout" : "Netzwerkfehler");
    return {
      ok: false,
      grund: timeout ? "Workflow antwortet nicht (Timeout)" : "Workflow nicht erreichbar",
    };
  }
}
