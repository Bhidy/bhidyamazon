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
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon,
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAV_GROUPS } from "@/lib/constants";
import { useLocale } from "@/lib/locale";

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
  Target,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  return (
    <Sidebar collapsible="icon" side={isAr ? "right" : "left"}>
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
            <span className="text-[11px] text-muted-foreground">
              {isAr ? "رادار amazon.eg" : "amazon.eg radar"}
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1.5">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.labelEn}>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isAr ? group.labelAr : group.labelEn}
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
                        tooltip={isAr ? item.labelAr : item.labelEn}
                        className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-accent-foreground"
                      >
                        <Icon />
                        <span>{isAr ? item.labelAr : item.labelEn}</span>
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
      <SidebarRail />
    </Sidebar>
  );
}
