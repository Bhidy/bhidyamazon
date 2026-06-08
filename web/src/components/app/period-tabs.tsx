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
    <div className="inline-flex rounded-full bg-muted/60 p-1" role="tablist">
      {PERIODS.map((p) => (
        <Link
          key={p.k}
          href={href(p.k)}
          role="tab"
          aria-selected={value === p.k}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            value === p.k
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.l}
        </Link>
      ))}
    </div>
  );
}
