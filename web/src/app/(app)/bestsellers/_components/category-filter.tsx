"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";

/**
 * Horizontal category chip filter for the Best Sellers list. An "All" chip plus
 * one chip per top category, each a Link to `?category=<nodeId>&period=<period>`
 * that preserves the active period. Highlights the active chip.
 *
 * Built with usePathname + manually constructed hrefs (no useSearchParams) so it
 * needs no Suspense boundary, mirroring PeriodTabs.
 */
export function CategoryFilter({
  period,
  active,
}: {
  /** Current period to preserve across category changes. */
  period: string;
  /** Active category nodeId, or undefined for "All". */
  active?: string;
}) {
  const pathname = usePathname();

  const href = (nodeId?: string) => {
    const sp = new URLSearchParams();
    if (nodeId) sp.set("category", nodeId);
    sp.set("period", period);
    return `${pathname}?${sp.toString()}`;
  };

  const chipClass = (isActive: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      isActive
        ? "border-brand/30 bg-brand/10 text-brand"
        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav aria-label="Filter best sellers by category">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={href()}
            aria-current={active ? undefined : "page"}
            className={chipClass(!active)}
          >
            All
          </Link>
        </li>
        {CATEGORIES.map((c) => {
          const isActive = active === c.nodeId;
          return (
            <li key={c.nodeId}>
              <Link
                href={href(c.nodeId)}
                aria-current={isActive ? "page" : undefined}
                title={c.nameAr}
                className={chipClass(isActive)}
              >
                {c.nameEn}
                <span dir="rtl" className="font-arabic text-[10px] opacity-70">
                  {c.nameAr}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
