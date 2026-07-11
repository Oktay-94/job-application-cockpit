import type { Metadata } from "next";
import { AgentChat } from "@/components/agent-chat";

export const metadata: Metadata = {
  title: "Agent – Bewerbungs-Cockpit",
};

export default function AgentSeite() {
  return <AgentChat />;
}
