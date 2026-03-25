"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Instagram, BarChart2, CalendarDays, Users,
  Newspaper, Zap, Layers, Settings, Bot,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n";

const NAV_KEYS: { tKey: string; href: string; icon: typeof Layers; badge: string | null }[] = [
  { tKey: "nav.projects",    href: "/projects",    icon: Layers,       badge: "PM" },
  { tKey: "nav.assistant",   href: "/agent",       icon: Bot,          badge: "AI" },
  { tKey: "nav.studio",      href: "/instagram",   icon: Instagram,    badge: null },
  { tKey: "nav.analytics",   href: "/analytics",   icon: BarChart2,    badge: null },
  { tKey: "nav.calendar",    href: "/calendar",    icon: CalendarDays, badge: null },
  { tKey: "nav.competitors", href: "/competitors", icon: Users,        badge: null },
  { tKey: "nav.news",        href: "/news",        icon: Newspaper,    badge: null },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { lang, t } = useLang();
  const [businessName, setBusinessName] = useState("Flogen AI");
  const [tagline, setTagline] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");

  // Read workspace settings from localStorage (updated via Settings page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("flogen_workspace_settings");
      if (raw) {
        const ws = JSON.parse(raw);
        if (ws.businessName) setBusinessName(ws.businessName);
        if (ws.tagline) setTagline(ws.tagline);
        if (ws.logoDataUrl) setLogoDataUrl(ws.logoDataUrl);
      }
    } catch { /* ignore */ }
  }, [pathname]); // re-read whenever the user navigates (picks up Settings changes)

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2.5">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#bbf088]">
                <Zap className="h-4 w-4 text-[#0a0a0a]" />
              </div>
            )}
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                {businessName}
              </span>
              <span className="text-[11px] text-sidebar-foreground/60">{tagline || t("nav.subtitle")}</span>
            </div>
            {lang !== "en" && (
              <span className="ml-auto text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#bbf088]/15 text-[#bbf088] group-data-[collapsible=icon]:hidden">
                {lang}
              </span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_KEYS.map((item) => {
                  const isActive = pathname === item.href;
                  const label = t(item.tKey);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={label}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{label}</span>
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
          {/* Settings link */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/settings" />}
                isActive={pathname === "/settings"}
                tooltip={t("nav.settings")}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span className="flex-1">{t("nav.settings")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Version */}
          <div className="px-4 py-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-sidebar-foreground/40">v0.2.0</span>
              <span className="text-[11px] text-sidebar-foreground/40">·</span>
              <span className="text-[11px] text-[#bbf088]/70">{businessName}</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

    </>
  );
}
