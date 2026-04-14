"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  DollarSign,
  Smartphone,
  Megaphone,
  FolderOpen,
  Bot,
  Cpu,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebar-store";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/social", label: "Social Media", icon: Smartphone },
  { href: "/meta-ads", label: "Meta Ads", icon: Megaphone },
  { href: "/resources", label: "Resources", icon: FolderOpen },
  { href: "/agents", label: "Agents", icon: Cpu },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#1E1E1E] bg-[#0A0A0A] transition-all duration-300",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-[#1E1E1E] px-4">
        <div className="flex items-center gap-3">
          <img
            src="https://cdn.shopify.com/s/files/1/0729/6424/3631/files/WhatsApp_Image_2026-03-08_at_19.02.23.jpg?v=1772968015"
            alt="Flogen AI"
            width={32}
            height={32}
            className="shrink-0 rounded-lg"
          />
          {!isCollapsed && (
            <span className="text-lg font-semibold tracking-tight">
              Flogen AI
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#1E1E1E] p-2">
        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/chat"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-[#1E1E1E] hover:text-foreground",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Team Chat" : undefined}
        >
          <MessageSquare className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Team Chat</span>}
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#1E1E1E] hover:text-foreground",
            isCollapsed && "justify-center px-2"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
