"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Send,
  Trophy,
  Inbox,
  House,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

interface ChatNachricht {
  role: "user" | "assistant";
  content: string;
}

// Beispielfragen + Icon je Frage (nur fürs Empty-State-Grid). Die Frage selbst
// ist unverändert der Text, der an /api/agent geht.
const BEISPIEL_FRAGEN = [
  { frage: "Wie viele Bewerbungen sind versendet?", icon: Send },
  { frage: "Zeig mir die Top-5-Stellen nach Score", icon: Trophy },
  { frage: "Was kam diese Woche neu rein?", icon: Inbox },
  { frage: "Wie viele Stellen erlauben Homeoffice?", icon: House },
] as const;

// Schnell-Chips über der Eingabe (nur während einer Unterhaltung).
const SCHNELL_FRAGEN = BEISPIEL_FRAGEN.map((b) => b.frage);

// Die API liefert reinen Text (ihr System-Prompt verbietet Markdown). Wir
// gruppieren aufeinanderfolgende "- "-Zeilen zu einer Liste, der Rest wird zu
// Absätzen — kein Markdown-Parser, keine erzwungenen Tabellen.
function AntwortText({ text }: { text: string }) {
  const zeilen = text.split("\n");
  const blocks: React.ReactNode[] = [];
  const istBullet = (z: string) => /^\s*[-•]\s+/.test(z);
  let i = 0;
  let key = 0;

  while (i < zeilen.length) {
    if (zeilen[i].trim() === "") {
      i++;
      continue;
    }
    if (istBullet(zeilen[i])) {
      const items: string[] = [];
      while (i < zeilen.length && istBullet(zeilen[i])) {
        items.push(zeilen[i].replace(/^\s*[-•]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </ul>,
      );
    } else {
      const para: string[] = [];
      while (i < zeilen.length && zeilen[i].trim() !== "" && !istBullet(zeilen[i])) {
        para.push(zeilen[i]);
        i++;
      }
      blocks.push(<p key={key++}>{para.join("\n")}</p>);
    }
  }

  return <>{blocks}</>;
}

export function AgentChat() {
  const [nachrichten, setNachrichten] = useState<ChatNachricht[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const listenEnde = useRef<HTMLDivElement>(null);

  const hatVerlauf = nachrichten.length > 0;

  useEffect(() => {
    listenEnde.current?.scrollIntoView({ behavior: "smooth" });
  }, [nachrichten, laeuft]);

  async function senden(frage: string) {
    const text = frage.trim();
    if (!text || laeuft) return;

    const verlauf: ChatNachricht[] = [...nachrichten, { role: "user", content: text }];
    setNachrichten(verlauf);
    setEingabe("");
    setFehler(null);
    setLaeuft(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: verlauf }),
      });
      const body: { antwort?: string; error?: string } = await res
        .json()
        .catch(() => ({}));

      if (res.ok && typeof body.antwort === "string") {
        setNachrichten([...verlauf, { role: "assistant", content: body.antwort }]);
      } else {
        setFehler(body.error ?? `Fehlgeschlagen (HTTP ${res.status})`);
      }
    } catch {
      setFehler("Server nicht erreichbar");
    }
    setLaeuft(false);
  }

  return (
    <div className="agent">
      <div className="page-head">
        <div>
          <span className="pill-read">
            <ShieldCheck strokeWidth={2} />
            Nur lesend
          </span>
          <div className="agent-title">
            <Image
              src="/emoji/robot.png"
              alt=""
              width={44}
              height={44}
              className="agent-bot"
              priority
            />
            <h1>Agent</h1>
          </div>
          <p>
            Frag in normaler Sprache etwas zu deiner Pipeline — der Agent liest live
            aus deiner Datenbank und antwortet mit echten Zahlen.
          </p>
        </div>
        {hatVerlauf && (
          <button
            type="button"
            className="btn btn-ghost btn-sm agent-reset"
            onClick={() => {
              setNachrichten([]);
              setFehler(null);
            }}
            disabled={laeuft}
          >
            <RotateCcw strokeWidth={2} />
            Neuer Chat
          </button>
        )}
      </div>

      <div className="chat">
        <div className="scroll">
          {!hatVerlauf && !laeuft && (
            <div className="empty">
              <div className="orb">
                <Sparkles strokeWidth={2} />
              </div>
              <h3>Was möchtest du wissen?</h3>
              <div className="sub">
                Stell eine Frage zu deinen Stellen, Scores oder Rückmeldungen. Ich
                lese nur — geändert wird nichts.
              </div>
              <div className="chips">
                {BEISPIEL_FRAGEN.map(({ frage, icon: Icon }) => (
                  <button
                    key={frage}
                    type="button"
                    className="chip"
                    onClick={() => senden(frage)}
                  >
                    <span className="ci">
                      <Icon strokeWidth={2} />
                    </span>
                    {frage}
                  </button>
                ))}
              </div>
            </div>
          )}

          {nachrichten.map((n, i) => (
            <div key={i} className={n.role === "user" ? "msg user" : "msg bot"}>
              <div className={n.role === "user" ? "ava me" : "ava bot"}>
                {n.role === "user" ? "MM" : <Sparkles strokeWidth={2} />}
              </div>
              <div className={n.role === "user" ? "bubble" : "bubble wide"}>
                {n.role === "user" ? n.content : <AntwortText text={n.content} />}
              </div>
            </div>
          ))}

          {laeuft && (
            <div className="msg bot">
              <div className="ava bot">
                <Sparkles strokeWidth={2} />
              </div>
              <div className="bubble">
                <span className="typing animate-pulse">
                  Agent fragt die Datenbank ab …
                </span>
              </div>
            </div>
          )}

          {fehler && (
            <div className="agent-error">
              <AlertCircle strokeWidth={2} />
              {fehler}
            </div>
          )}

          <div ref={listenEnde} />
        </div>

        {hatVerlauf && (
          <div className="quick">
            {SCHNELL_FRAGEN.map((frage) => (
              <button
                key={frage}
                type="button"
                className="qchip"
                onClick={() => senden(frage)}
                disabled={laeuft}
              >
                {frage}
              </button>
            ))}
          </div>
        )}

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            senden(eingabe);
          }}
        >
          <div className="field">
            <input
              type="text"
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              placeholder="Frag etwas zu deiner Pipeline …"
              maxLength={4000}
              aria-label="Frage an den Agent"
            />
          </div>
          <button
            type="submit"
            className="send"
            aria-label="Senden"
            disabled={laeuft || eingabe.trim().length === 0}
          >
            <Send strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
