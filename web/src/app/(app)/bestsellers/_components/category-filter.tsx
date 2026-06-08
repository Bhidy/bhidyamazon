"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { useLocale } from "@/lib/locale";

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
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const href = (nodeId?: string) => {
    const sp = new URLSearchParams();
    if (nodeId) sp.set("category", nodeId);
    sp.set("period", period);
    return `${pathname}?${sp.toString()}`;
  };

  const chipClass = (isActive: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav
      aria-label={isAr ? "تصفية الأكثر مبيعاً حسب الفئة" : "Filter best sellers by category"}
      className="rounded-2xl border border-border/60 bg-card p-2 shadow-card"
    >
      <ul className="flex flex-wrap gap-1.5">
        <li>
          <Link
            href={href()}
            aria-current={active ? undefined : "page"}
            className={chipClass(!active)}
          >
            {isAr ? "الكل" : "All"}
          </Link>
        </li>
        {CATEGORIES.map((c) => {
          const isActive = active === c.nodeId;
          return (
            <li key={c.nodeId}>
              <Link
                href={href(c.nodeId)}
                aria-current={isActive ? "page" : undefined}
                title={isAr ? c.nameEn : c.nameAr}
                className={chipClass(isActive)}
              >
                {isAr ? c.nameAr : c.nameEn}
                <span
                  dir={isAr ? "ltr" : "rtl"}
                  className="font-arabic text-[10px] opacity-70"
                >
                  {isAr ? c.nameEn : c.nameAr}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
