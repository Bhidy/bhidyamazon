"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { useLocale } from "@/lib/locale";

const ALL = "all";

/**
 * Category filter for the Movers screen. Mirrors PeriodTabs' behaviour: it is a
 * thin client control that pushes the chosen category into the URL while
 * preserving the active period, so the page stays a Server Component that reads
 * `searchParams`. Base UI Select (not Radix) — `value`/`onValueChange`, with an
 * `items` map so <SelectValue> renders the category label, never the raw node id.
 */
export function CategoryFilter({
  value,
  period,
}: {
  value?: string;
  period: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const allLabel = isAr ? "جميع الفئات" : "All categories";

  const items: Record<string, string> = {
    [ALL]: allLabel,
    ...Object.fromEntries(CATEGORIES.map((c) => [c.nodeId, isAr ? c.nameAr : c.nameEn])),
  };

  const onValueChange = (next: string | null) => {
    const sp = new URLSearchParams({ period });
    if (next && next !== ALL) sp.set("category", next);
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <Select
      items={items}
      value={value ?? ALL}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        size="sm"
        className="min-w-[10rem]"
        aria-label={isAr ? "تصفية حسب الفئة" : "Filter by category"}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {CATEGORIES.map((c) => (
          <SelectItem key={c.nodeId} value={c.nodeId}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>{isAr ? c.nameAr : c.nameEn}</span>
              <span dir={isAr ? "ltr" : "rtl"} className="font-arabic text-muted-foreground">
                {isAr ? c.nameEn : c.nameAr}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
