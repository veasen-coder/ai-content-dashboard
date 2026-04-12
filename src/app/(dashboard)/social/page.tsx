"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Camera } from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "calendar", label: "Calendar" },
];

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <PageWrapper title="Social Media">
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

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Instagram Card */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Instagram</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect to view metrics
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Followers</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Posts</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reach (7d)</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
              </div>
            </div>

            {/* Facebook Card */}
            <div className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <span className="text-lg font-bold text-white">f</span>
                </div>
                <div>
                  <h3 className="font-semibold">Facebook</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect to view metrics
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Page Likes</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Posts</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reach (7d)</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                  <p className="text-lg font-bold font-mono">—</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "overview" && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E1E1E] bg-[#111111] py-16">
            <p className="text-sm text-muted-foreground">
              {activeTab === "tasks"
                ? "Connect ClickUp to see social media tasks"
                : "Social calendar will show scheduled and published posts"}
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
