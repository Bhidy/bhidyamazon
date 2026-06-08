"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LANGS = [
  { k: "all", l: "All", labelAr: undefined },
  { k: "en", l: "English", labelAr: undefined },
  { k: "ar", l: "العربية", labelAr: "ar" },
] as const;

/**
 * Language scope for the demand radar (All / English / العربية).
 * Link chips that set `?lang=` while preserving the current pathname — mirrors
 * the PeriodTabs pattern (usePathname only, no Suspense requirement).
 */
export function LangFilter({
  value,
  params = {},
}: {
  value: string;
  params?: Record<string, string>;
}) {
  const pathname = usePathname();
  const href = (k: string) => {
    const sp = new URLSearchParams({ ...params, lang: k });
    return `${pathname}?${sp.toString()}`;
  };
  return (
    <div
      className="inline-flex rounded-full border border-border bg-muted/60 p-1"
      role="tablist"
      aria-label="Filter keywords by language"
    >
      {LANGS.map((opt) => (
        <Link
          key={opt.k}
          href={href(opt.k)}
          role="tab"
          aria-selected={value === opt.k}
          dir={opt.labelAr ? "rtl" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            opt.labelAr && "font-arabic",
            value === opt.k
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.l}
        </Link>
      ))}
    </div>
  );
}
