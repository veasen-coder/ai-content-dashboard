"use client";

import { Topbar } from "./topbar";

interface PageWrapperProps {
  title: string;
  lastSynced?: string | null;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function PageWrapper({ title, lastSynced, headerExtra, children }: PageWrapperProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar title={title} lastSynced={lastSynced} headerExtra={headerExtra} />
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
