"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bookmark,
  Boxes,
  Calculator,
  LayoutDashboard,
  Radar,
  Search,
  Settings,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAV_GROUPS } from "@/lib/constants";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Trophy,
  TrendingUp,
  Radar,
  Boxes,
  Search,
  Calculator,
  Bookmark,
  Bell,
  Settings,
};

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-1.5 py-1.5"
          aria-label="Rasid home"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radar className="size-4.5" />
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">Rasid</span>
            <span className="text-[11px] text-muted-foreground">amazon.eg radar</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.labelEn}>
            <SidebarGroupLabel>{group.labelEn}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Activity;
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        tooltip={item.labelEn}
                      >
                        <Icon />
                        <span>{item.labelEn}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-md bg-sidebar-accent/60 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          Personal-use research tool. Signals are relative, not exact units.
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
