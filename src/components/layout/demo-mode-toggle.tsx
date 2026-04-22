"use client";

import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useDemoModeStore } from "@/store/demo-mode-store";
import { toast } from "sonner";

/**
 * CensorModeToggle — in-place censoring of the live dashboard.
 *
 * Distinct from the "Demo Mode" feature (which redirects to pre-built
 * fake pages under `/demo-mode/*`). This toggle leaves you on the real
 * pages but blurs/replaces sensitive fields so you can safely showcase
 * the dashboard's structure + behaviour to a prospective client.
 *
 * Lives in the per-page Topbar (top-right). Shortcut: Cmd/Ctrl + Shift + X.
 */
export function DemoModeToggle() {
  const enabled = useDemoModeStore((s) => s.isCensorMode);
  const toggle = useDemoModeStore((s) => s.toggleCensorMode);

  // Keyboard shortcut: Cmd/Ctrl + Shift + X (X = censor)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "x") {
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
      enabled ? "Censor off — real data visible" : "Censor on — sensitive data hidden",
      { duration: 1800 }
    );
  }

  return (
    <button
      onClick={handleClick}
      title={
        enabled
          ? "Censor ON — click to disable (⌘⇧X)"
          : "Enable censor for client showcase (⌘⇧X)"
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
        {enabled ? "Censor: ON" : "Censor"}
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

/** Optional: a banner ribbon shown across the top of the page while censor is on. */
export function DemoModeRibbon() {
  const enabled = useDemoModeStore((s) => s.isCensorMode);
  if (!enabled) return null;

  return (
    <div className="demo-mode-ribbon flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-medium text-primary">
      <Eye className="h-3 w-3" />
      <span>Censor mode — sensitive data is hidden. Hover blurred text to preview.</span>
    </div>
  );
}
