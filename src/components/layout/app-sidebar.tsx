"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Instagram, BarChart2, CalendarDays, Users,
  Newspaper, Zap, Layers, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { SettingsPanel, DashboardPrefs } from "@/components/settings/settings-panel";

const DEFAULT_PREFS: DashboardPrefs = {
  colNames:    { today: "Today", week: "This Week", backlog: "Backlog" },
  visibleTabs: { sprint: true, projects: true, agents: true, focus: true },
  accentColor: "#bbf088",
  appTagline:  "We build the bots. You build the brand.",
};

const navItems = [
  { title: "Flogen AI",         href: "/projects",    icon: Layers,       badge: "PM" },
  { title: "Content Studio",    href: "/instagram",   icon: Instagram,    badge: null },
  { title: "Analytics",         href: "/analytics",   icon: BarChart2,    badge: null },
  { title: "Content Calendar",  href: "/calendar",    icon: CalendarDays, badge: null },
  { title: "Competitor Intel",  href: "/competitors", icon: Users,        badge: null },
  { title: "News & Inspiration",href: "/news",        icon: Newspaper,    badge: null },
];

export function AppSidebar() {
  const pathname           = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs]  = useState<DashboardPrefs>(DEFAULT_PREFS);

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#bbf088]">
              <Zap className="h-4 w-4 text-[#0a0a0a]" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                Flogen AI
              </span>
              <span className="text-[11px] text-sidebar-foreground/60">Content OS</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[10px] px-1.5 py-0 group-data-[collapsible=icon]:hidden bg-[#bbf088]/20 text-[#bbf088] border-0"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          {/* Settings button */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setSettingsOpen(true)}
                tooltip="Settings"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span className="flex-1">Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Version */}
          <div className="px-4 py-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-sidebar-foreground/40">v0.2.0</span>
              <span className="text-[11px] text-sidebar-foreground/40">·</span>
              <span className="text-[11px] text-[#bbf088]/70">Flogen AI</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Settings panel — lives outside the sidebar so it can overlay the full page */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onPrefs={setPrefs}
      />
    </>
  );
}
