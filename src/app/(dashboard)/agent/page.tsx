"use client";

import { useState } from "react";
import { Bot, Zap } from "lucide-react";
import { DashboardAgent } from "@/components/agent/dashboard-agent";
import { AutomationsDashboard } from "@/components/agent/automations-dashboard";

type Tab = "assistant" | "automations";

const TABS: { id: Tab; label: string; Icon: typeof Bot }[] = [
  { id: "assistant",    label: "AI Assistant",  Icon: Bot  },
  { id: "automations",  label: "Automations",   Icon: Zap  },
];

export default function AgentPage() {
  const [tab, setTab] = useState<Tab>("assistant");

  return (
    <div className="-m-6" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* ── Tab bar ── */}
      <div style={{
        background: "#111111",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 24px",
        display: "flex", gap: 0,
        position: "sticky", top: 0, zIndex: 20, flexShrink: 0,
      }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "13px 0", marginRight: 28, background: "none", border: "none",
                borderBottom: active ? "2px solid #bbf088" : "2px solid transparent",
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                color: active ? "#bbf088" : "#9a9a9a",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "color 0.12s",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#f5f0e6"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#9a9a9a"; }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {tab === "assistant"   && <DashboardAgent />}
        {tab === "automations" && <AutomationsDashboard />}
      </div>
    </div>
  );
}
