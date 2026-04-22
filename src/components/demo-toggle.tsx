"use client";

import { useState, useEffect, useRef } from "react";
import { Presentation } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useDemoModeStore } from "@/store/demo-mode-store";
import { cn } from "@/lib/utils";

export function DemoToggle() {
  const { isDemoMode, demoClientName, toggleDemoMode, setDemoClientName } =
    useDemoModeStore();
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState(demoClientName);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalName(demoClientName);
  }, [demoClientName]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleToggle() {
    const willBeOn = !isDemoMode;
    toggleDemoMode();
    if (willBeOn) {
      // Going into demo mode: redirect to demo CRM if not already on a demo page
      if (!pathname.startsWith("/demo-mode")) {
        router.push("/demo-mode/crm");
      }
    } else {
      // Leaving demo mode: redirect out to dashboard if on demo page
      if (pathname.startsWith("/demo-mode")) {
        router.push("/dashboard");
      }
    }
  }

  function commitName() {
    const trimmed = localName.trim();
    if (trimmed) {
      setDemoClientName(trimmed);
    } else {
      setLocalName(demoClientName);
    }
    setEditing(false);
  }

  if (!isDemoMode) {
    return (
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Presentation className="h-3.5 w-3.5" />
        <span>Demo Mode</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-primary/20">
      <div className="relative flex h-2 w-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
      </div>
      <Presentation className="h-3.5 w-3.5" />
      <button
        onClick={handleToggle}
        className="hover:underline"
        title="Turn off demo mode"
      >
        Demo Mode ON
      </button>
      <span className="h-3.5 w-px bg-white/30" />
      {editing ? (
        <input
          ref={inputRef}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName();
            if (e.key === "Escape") {
              setLocalName(demoClientName);
              setEditing(false);
            }
          }}
          className={cn(
            "w-48 rounded bg-white/20 px-2 py-0.5 text-xs font-medium text-white placeholder-white/60",
            "focus:bg-white/30 focus:outline-none"
          )}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="max-w-[200px] truncate text-xs font-medium text-white/95 hover:text-white hover:underline"
          title="Click to edit client name"
        >
          {demoClientName}
        </button>
      )}
    </div>
  );
}
