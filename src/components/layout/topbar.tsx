"use client";

import { Bell, Search } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface TopbarProps {
  title: string;
  lastSynced?: string | null;
}

export function Topbar({ title, lastSynced }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[#1E1E1E] bg-[#0A0A0A]/80 px-6 backdrop-blur-sm">
      <h1 className="text-xl font-semibold">{title}</h1>

      {lastSynced && (
        <span className="text-sm text-muted-foreground">
          Last synced: {formatRelativeTime(lastSynced)}
        </span>
      )}

      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground">
          <Search className="h-4 w-4" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
