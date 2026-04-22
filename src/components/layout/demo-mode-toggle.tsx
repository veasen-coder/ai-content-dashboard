"use client";

import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useDemoModeStore } from "@/store/demo-mode-store";
import { toast } from "sonner";

export function DemoModeToggle() {
  const enabled = useDemoModeStore((s) => s.enabled);
  const toggle = useDemoModeStore((s) => s.toggle);

  // Keyboard shortcut: Cmd/Ctrl + Shift + D
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  function handleClick() {
    toggle();
    toast.success(
      enabled ? "Demo mode off — real data visible" : "Demo mode on — sensitive data censored",
      { duration: 1800 }
    );
  }

  return (
    <button
      onClick={handleClick}
      title={
        enabled
          ? "Demo mode ON — click to disable (⌘⇧D)"
          : "Enable demo mode for client showcase (⌘⇧D)"
      }
      className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        enabled
          ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
          : "border-[#1E1E1E] bg-[#0A0A0A] text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {enabled ? (
        <EyeOff className="h-3.5 w-3.5" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">
        {enabled ? "Demo: ON" : "Demo"}
      </span>
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors ${
          enabled
            ? "bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)]"
            : "bg-[#2E2E2E]"
        }`}
      />
    </button>
  );
}

/** Optional: a banner ribbon shown across the top of the page while demo is on. */
export function DemoModeRibbon() {
  const enabled = useDemoModeStore((s) => s.enabled);
  if (!enabled) return null;

  return (
    <div className="demo-mode-ribbon flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-medium text-primary">
      <Eye className="h-3 w-3" />
      <span>Demo mode — sensitive data is censored. Hover blurred text to preview.</span>
    </div>
  );
}
