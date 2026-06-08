"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { useLocale } from "@/lib/locale";

/**
 * Niche selector for the Opportunity Finder. Unlike the catalogue's category
 * filter there is no "All" — the finder always scores one niche at a time
 * (peer competition/demand are within-niche), defaulting to automotive.
 */
export function NicheFilter({ active }: { active: string }) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const chip = (selected: boolean) =>
    cn(
      "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      selected
        ? "border-transparent bg-accent text-brand-foreground shadow-card"
        : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav aria-label={isAr ? "اختر الفئة" : "Choose a niche"} className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((c) => {
        const selected = active === c.nodeId;
        return (
          <Link
            key={c.nodeId}
            href={`${pathname}?category=${c.nodeId}`}
            aria-current={selected ? "true" : undefined}
            className={chip(selected)}
          >
            {isAr ? c.nameAr : c.nameEn}
            <span className="ms-1.5 font-arabic text-[10px] opacity-70" dir={isAr ? "ltr" : "rtl"}>
              {isAr ? c.nameEn : c.nameAr}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
