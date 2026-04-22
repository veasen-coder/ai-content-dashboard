"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useDemoModeStore, DEMO_INDUSTRIES } from "@/store/demo-mode-store";
import { DEMO_PRESETS } from "@/lib/demo-industry-presets";
import { cn } from "@/lib/utils";

export function DemoIndustrySwitcher() {
  const { isDemoMode, selectedIndustry, setSelectedIndustry } = useDemoModeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isDemoMode) return null;

  const current = DEMO_PRESETS[selectedIndustry];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20",
          open && "bg-white/20"
        )}
        title="Switch demo industry"
      >
        <span className="text-sm leading-none">{current.emoji}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Show demo as
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {DEMO_INDUSTRIES.map((industry) => {
              const preset = DEMO_PRESETS[industry];
              const isActive = industry === selectedIndustry;
              return (
                <button
                  key={industry}
                  onClick={() => {
                    setSelectedIndustry(industry);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                    isActive && "bg-primary/10"
                  )}
                >
                  <span className="mt-0.5 text-base leading-none">
                    {preset.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {preset.label}
                      </p>
                      {isActive && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {preset.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
