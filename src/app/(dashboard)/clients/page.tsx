"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

const tabs = [
  { id: "pipeline", label: "Pipeline" },
  { id: "onboarding", label: "Onboarding" },
  { id: "tasks", label: "Task List" },
  { id: "active", label: "Active Clients" },
];

const pipelineStages = [
  "Lead",
  "Book Call",
  "Call",
  "Thank You",
  "Meeting Minutes",
  "Demo",
  "Follow Up",
  "Closing",
];

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState("pipeline");

  return (
    <PageWrapper title="Clients">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-[#111111] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pipeline View */}
        {activeTab === "pipeline" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Drag clients between stages
              </p>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                + Add Lead
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {pipelineStages.map((stage) => (
                <div key={stage} className="min-w-[200px] flex-shrink-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {stage}
                    </h3>
                    <span className="rounded-md bg-[#1E1E1E] px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                      0
                    </span>
                  </div>
                  <div className="min-h-[300px] rounded-xl border border-dashed border-[#1E1E1E] p-2">
                    <p className="text-center text-xs text-muted-foreground pt-8">
                      Empty
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs - placeholder */}
        {activeTab !== "pipeline" && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
            <p className="text-sm text-muted-foreground">
              {activeTab === "onboarding" && "No clients in onboarding"}
              {activeTab === "tasks" && "Connect ClickUp to see client tasks"}
              {activeTab === "active" && "No active clients yet"}
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
