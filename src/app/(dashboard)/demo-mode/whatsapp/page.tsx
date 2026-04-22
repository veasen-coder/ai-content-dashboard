"use client";

import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Zap, ShieldCheck } from "lucide-react";
import { useDemoModeStore } from "@/store/demo-mode-store";
import WhatsAppCrmPage from "@/app/(dashboard)/whatsapp/page";
import DemoWhatsAppView from "@/components/demo-whatsapp-view";

type ViewMode = "demo" | "live";

function ViewToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-lg">
      <button
        onClick={() => setViewMode("demo")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          viewMode === "demo"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Zap className="h-3.5 w-3.5" />
        Demo
      </button>
      <button
        onClick={() => setViewMode("live")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          viewMode === "live"
            ? "bg-emerald-500 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Live (Censored)
      </button>
    </div>
  );
}

export default function DemoModeWhatsAppPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("demo");
  const setCensorMode = useDemoModeStore((s) => s.setCensorMode);

  // Enable the global censor mode when viewing the live tab so names/phones
  // are masked throughout the real WhatsApp CRM. Always reset on unmount.
  useEffect(() => {
    setCensorMode(viewMode === "live");
    return () => setCensorMode(false);
  }, [viewMode, setCensorMode]);

  if (viewMode === "demo") {
    return (
      <PageWrapper
        title="WhatsApp Chatbot Demo"
        headerExtra={<ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
      >
        <DemoWhatsAppView />
      </PageWrapper>
    );
  }

  // Live mode — render the real WhatsApp CRM (which has its own PageWrapper)
  // with a floating toggle pill anchored to the top-right of the viewport.
  return (
    <div className="relative">
      <div className="fixed right-6 top-20 z-40">
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>
      <WhatsAppCrmPage />
    </div>
  );
}
