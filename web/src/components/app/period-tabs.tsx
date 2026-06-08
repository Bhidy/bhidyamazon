"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIODS = [
  { k: "daily", l: "Daily" },
  { k: "weekly", l: "Weekly" },
  { k: "monthly", l: "Monthly" },
] as const;

/**
 * Daily / Weekly / Monthly switch. Preserves other query params (e.g. category)
 * via `params`. Uses usePathname only (no Suspense requirement).
 */
export function PeriodTabs({
  value,
  params = {},
}: {
  value: string;
  params?: Record<string, string>;
}) {
  const pathname = usePathname();
  const href = (k: string) => {
    const sp = new URLSearchParams({ ...params, period: k });
    return `${pathname}?${sp.toString()}`;
  };
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5" role="tablist">
      {PERIODS.map((p) => (
        <Link
          key={p.k}
          href={href(p.k)}
          role="tab"
          aria-selected={value === p.k}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === p.k
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.l}
        </Link>
      ))}
    </div>
  );
}
