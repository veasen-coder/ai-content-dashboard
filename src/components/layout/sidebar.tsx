"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getWaBackendUrl, fetchActiveSessionId } from "@/lib/wa-backend";
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
  ChevronDown,
  BarChart3,
  Calendar,
  MessageCircle,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebar-store";
import { useDemoModeStore } from "@/store/demo-mode-store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: { href: string; label: string; icon: React.ElementType }[];
}

const regularNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  {
    href: "/finance",
    label: "Finance",
    icon: DollarSign,
    children: [
      { href: "/finance", label: "Dashboard", icon: DollarSign },
      { href: "/finance/metrics", label: "Business Metrics", icon: BarChart3 },
    ],
  },
  { href: "/social", label: "Social Media", icon: Smartphone },
  { href: "/meta-ads", label: "Meta Ads", icon: Megaphone },
  { href: "/resources", label: "Resources", icon: FolderOpen },
  { href: "/agents", label: "Agents", icon: Cpu },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

const demoNavItems: NavItem[] = [
  { href: "/demo-mode/crm", label: "CRM Dashboard", icon: LayoutDashboard },
  { href: "/demo-mode/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/demo-mode/calendar", label: "Calendar & Bookings", icon: Calendar },
  { href: "/demo-mode/clients", label: "Client List", icon: Users },
  { href: "/demo-mode/integrations", label: "Integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebarStore();
  const { isDemoMode } = useDemoModeStore();
  const [unreadBookings, setUnreadBookings] = useState(0);
  const [popupSeen, setPopupSeen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // Poll booking unread count every 30s for the Calendar badge + popup
  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;

    async function poll() {
      const base = getWaBackendUrl();
      if (!base) return;
      if (!sessionIdRef.current) {
        sessionIdRef.current = await fetchActiveSessionId();
      }
      if (!sessionIdRef.current) return;
      try {
        const res = await fetch(`${base}/api/sessions/${sessionIdRef.current}/bookings/unread-count`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (!cancelled) setUnreadBookings(data.count ?? 0);
      } catch { /* silent — backend may be offline */ }
    }

    poll();
    const id = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isDemoMode]);

  // Reset popup when user navigates to /calendar OR when unread drops to 0
  useEffect(() => {
    if (pathname === "/calendar" || unreadBookings === 0) setPopupSeen(true);
    else setPopupSeen(false);
  }, [pathname, unreadBookings]);

  const navItems = isDemoMode ? demoNavItems : regularNavItems;

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      navItems.forEach((item) => {
        if (item.children && pathname.startsWith(item.href)) {
          initial[item.href] = true;
        }
      });
      return initial;
    }
  );

  function toggleMenu(href: string) {
    setExpandedMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-300",
        // Desktop
        isCollapsed ? "w-16" : "w-60",
        // Mobile: slide in/out
        "max-md:-translate-x-full max-md:w-72 max-md:shadow-2xl",
        isMobileOpen && "max-md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-3">
          <img
            src="https://cdn.shopify.com/s/files/1/0729/6424/3631/files/WhatsApp_Image_2026-03-08_at_19.02.23.jpg?v=1772968015"
            alt="Flogen AI"
            width={32}
            height={32}
            className="shrink-0 rounded-lg"
          />
          {(!isCollapsed || isMobileOpen) && (
            <span className="text-lg font-semibold tracking-tight">
              Flogen AI
            </span>
          )}
        </div>
      </div>

      {/* Demo mode banner */}
      {isDemoMode && (!isCollapsed || isMobileOpen) && (
        <div className="mx-2 mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Demo Mode
          </span>
        </div>
      )}
      {isDemoMode && isCollapsed && !isMobileOpen && (
        <div
          className="mx-2 mt-2 flex h-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10"
          title="Demo Mode"
        >
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus[item.href] || false;

          // Items with children — render dropdown (show when not collapsed on desktop, or on mobile)
          if (hasChildren && (!isCollapsed || isMobileOpen)) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {/* Sub-items */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isExpanded ? "max-h-40 mt-0.5" : "max-h-0"
                  )}
                >
                  <div className="ml-4 space-y-0.5 border-l border-border pl-3">
                    {item.children!.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={closeMobile}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                            isChildActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // Items with children but sidebar collapsed — just link to parent
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed && !isMobileOpen && "justify-center px-2"
              )}
              title={isCollapsed && !isMobileOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        {!isDemoMode && (
          <>
            <Link
              href="/chat"
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/chat"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed && !isMobileOpen && "justify-center px-2"
              )}
              title={isCollapsed && !isMobileOpen ? "Team Chat" : undefined}
            >
              <MessageSquare className="h-5 w-5 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>Team Chat</span>}
            </Link>
            <div className="relative">
              <Link
                href="/calendar"
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/calendar"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && !isMobileOpen && "justify-center px-2"
                )}
                title={isCollapsed && !isMobileOpen ? `Calendar${unreadBookings > 0 ? ` — ${unreadBookings} new booking${unreadBookings > 1 ? "s" : ""}` : ""}` : undefined}
              >
                <div className="relative shrink-0">
                  <Calendar className="h-5 w-5" />
                  {unreadBookings > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                  )}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>Calendar</span>
                    {unreadBookings > 0 && (
                      <span className="ml-2 rounded-full bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                        {unreadBookings}
                      </span>
                    )}
                  </span>
                )}
              </Link>
              {/* Mini popup — shows when new bookings arrive */}
              {unreadBookings > 0 && !popupSeen && (!isCollapsed || isMobileOpen) && pathname !== "/calendar" && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg border border-amber-500/40 bg-[#1A1209] px-3 py-1.5 text-[11px] text-amber-300 shadow-xl animate-[fade-in_0.25s_ease-out]">
                  <span className="font-semibold">📩 {unreadBookings} new booking{unreadBookings > 1 ? "s" : ""}</span>
                  <span className="ml-1.5 text-amber-300/70">— click to read</span>
                  <span className="absolute right-full top-1/2 -translate-y-1/2 -mr-px border-y-[5px] border-y-transparent border-r-[6px] border-r-amber-500/40" />
                </div>
              )}
              {unreadBookings > 0 && !popupSeen && isCollapsed && !isMobileOpen && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap rounded-lg border border-amber-500/40 bg-[#1A1209] px-2 py-1 text-[10px] text-amber-300 shadow-xl">
                  📩 {unreadBookings} new
                </div>
              )}
            </div>
          </>
        )}
        <Link
          href="/settings"
          onClick={closeMobile}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            isCollapsed && !isMobileOpen && "justify-center px-2"
          )}
          title={isCollapsed && !isMobileOpen ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {(!isCollapsed || isMobileOpen) && <span>Settings</span>}
        </Link>

        {/* Collapse button — desktop only */}
        <button
          onClick={toggle}
          className={cn(
            "hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex",
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
