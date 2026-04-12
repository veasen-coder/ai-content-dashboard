"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { FolderOpen } from "lucide-react";

const categories = [
  { id: "all", label: "All" },
  { id: "scripts", label: "Message Scripts" },
  { id: "meeting_minutes", label: "Meeting Minutes" },
  { id: "demos", label: "Demo HTMLs" },
  { id: "templates", label: "Templates" },
  { id: "other", label: "Other" },
];

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  return (
    <PageWrapper title="Resources">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              {categories.find((c) => c.id === activeCategory)?.label}
            </h2>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              + Add Resource
            </button>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E1E1E] py-16">
            <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No resources yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add resources to organize your scripts, demos, and templates
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
