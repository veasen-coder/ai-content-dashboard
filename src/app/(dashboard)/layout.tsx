"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { ClaudeBalance } from "@/components/claude-balance";
import { DemoToggle } from "@/components/demo-toggle";
import { useSidebarStore } from "@/store/sidebar-store";
import { useDemoModeStore } from "@/store/demo-mode-store";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed, isMobileOpen, toggleMobile } = useSidebarStore();
  const { isDemoMode, demoClientName } = useDemoModeStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={toggleMobile}
        />
      )}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300",
          // Desktop: margin for sidebar
          isCollapsed ? "md:ml-16" : "md:ml-60",
          // Mobile: no margin
          "ml-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Demo mode banner text */}
          {isDemoMode ? (
            <div className="hidden min-w-0 flex-1 items-center gap-2 text-xs font-medium text-primary md:flex">
              <span className="uppercase tracking-wider">Demo Mode</span>
              <span className="text-muted-foreground">—</span>
              <span className="truncate">
                Showing demo for:{" "}
                <span className="font-semibold text-foreground">
                  {demoClientName}
                </span>
              </span>
            </div>
          ) : (
            <div className="md:hidden" />
          )}

          <div className="flex items-center gap-2">
            <DemoToggle />
            {!isDemoMode && <ClaudeBalance />}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
