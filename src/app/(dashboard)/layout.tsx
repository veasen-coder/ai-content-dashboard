"use client";

import { Sidebar } from "@/components/layout/sidebar";
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
        {children}
      </div>
    </div>
  );
}
