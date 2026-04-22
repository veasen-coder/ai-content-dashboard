"use client";

import { Topbar } from "./topbar";
import { DemoModeRibbon } from "./demo-mode-toggle";

interface PageWrapperProps {
  title: string;
  lastSynced?: string | null;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  /** When true: no padding, no overflow on main — page controls its own scroll */
  fixed?: boolean;
}

export function PageWrapper({ title, lastSynced, headerExtra, children, fixed }: PageWrapperProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar title={title} lastSynced={lastSynced} headerExtra={headerExtra} />
      <DemoModeRibbon />
      {fixed ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      ) : (
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      )}
    </div>
  );
}
