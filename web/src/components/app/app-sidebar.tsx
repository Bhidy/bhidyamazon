"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bookmark,
  Boxes,
  Calculator,
  ChevronRight,
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
      <SidebarHeader className="gap-3 p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          aria-label="Rasid home"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-brand">
            <Radar className="size-5" />
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">Rasid</span>
            <span className="text-[11px] text-muted-foreground">amazon.eg radar</span>
          </div>
        </Link>
        {/* Brand identity block — static Rasid identity, echoes the Fynix account row. */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-2 shadow-card group-data-[collapsible=icon]:hidden">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hero-lime text-sm font-bold text-brand-foreground"
            aria-hidden="true"
          >
            R
          </div>
          <div className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">Rasid</span>
            <span className="truncate text-[11px] text-muted-foreground">amazon.eg radar</span>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1.5">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.labelEn}>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.labelEn}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
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
                        className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-accent-foreground"
                      >
                        <Icon />
                        <span>{item.labelEn}</span>
                        {active ? (
                          <span
                            className="ms-auto size-1.5 rounded-full bg-brand group-data-[collapsible=icon]:hidden"
                            aria-hidden="true"
                          />
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-2xl bg-accent px-3 py-3 text-[11px] leading-snug text-accent-foreground group-data-[collapsible=icon]:hidden">
          Personal-use research tool. Signals are relative, not exact units.
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
