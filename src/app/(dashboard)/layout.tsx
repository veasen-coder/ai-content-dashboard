"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { ClaudeBalance } from "@/components/claude-balance";
import { useSidebarStore } from "@/store/sidebar-store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300",
          isCollapsed ? "ml-16" : "ml-60"
        )}
      >
        {/* Global top bar with Claude balance */}
        <div className="flex items-center justify-end border-b border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2">
          <ClaudeBalance />
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
