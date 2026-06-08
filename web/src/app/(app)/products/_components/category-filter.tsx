"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";

/**
 * Category chips for the product catalogue. Same approach as the best-sellers
 * filter: a client component that builds hrefs off `usePathname()` (no
 * `useSearchParams`, so no Suspense boundary needed) and preserves the other
 * query params (sort, period) when switching category.
 */
export function CategoryFilter({
  active,
  params = {},
}: {
  /** The currently selected category node, or undefined for "All". */
  active?: string;
  /** Other query params to carry across (e.g. sort, period). */
  params?: Record<string, string>;
}) {
  const pathname = usePathname();

  const href = (node?: string) => {
    const sp = new URLSearchParams(params);
    if (node) sp.set("category", node);
    else sp.delete("category");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const chip = (selected: boolean) =>
    cn(
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
      selected
        ? "border-brand/40 bg-brand/10 text-brand"
        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-1.5">
      <Link href={href(undefined)} aria-current={!active ? "true" : undefined} className={chip(!active)}>
        All
      </Link>
      {CATEGORIES.map((c) => {
        const selected = active === c.nodeId;
        return (
          <Link
            key={c.nodeId}
            href={href(c.nodeId)}
            aria-current={selected ? "true" : undefined}
            className={chip(selected)}
          >
            {c.nameEn}
            <span className="ms-1.5 font-arabic text-[10px] opacity-70" dir="rtl">
              {c.nameAr}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
