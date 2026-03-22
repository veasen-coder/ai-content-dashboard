"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Instagram,
  BarChart2,
  CalendarDays,
  Users,
  Newspaper,
  LayoutDashboard,
  CheckSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  {
    title: "Instagram Manager",
    href: "/instagram",
    icon: Instagram,
    badge: null,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart2,
    badge: null,
  },
  {
    title: "Content Calendar",
    href: "/calendar",
    icon: CalendarDays,
    badge: null,
  },
  {
    title: "Competitor Tracker",
    href: "/competitors",
    icon: Users,
    badge: "New",
  },
  {
    title: "News Consolidator",
    href: "/news",
    icon: Newspaper,
    badge: null,
  },
  {
    title: "Habit & Goal Tracker",
    href: "/habits",
    icon: CheckSquare,
    badge: "New",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <LayoutDashboard className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">
              AI Content Hub
            </span>
            <span className="text-xs text-muted-foreground">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                          className="ml-auto text-[10px] px-1.5 py-0 group-data-[collapsible=icon]:hidden"
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

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1.0 — AI Content Dashboard
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
