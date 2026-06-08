"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/lib/locale";

export type SortKey = "rank" | "price-asc" | "price-desc" | "rating" | "reviews";

const OPTIONS: { value: SortKey; en: string; ar: string }[] = [
  { value: "rank", en: "Best Seller Rank", ar: "ترتيب الأكثر مبيعاً" },
  { value: "price-asc", en: "Price: low to high", ar: "السعر: من الأقل للأعلى" },
  { value: "price-desc", en: "Price: high to low", ar: "السعر: من الأعلى للأقل" },
  { value: "rating", en: "Top rated", ar: "الأعلى تقييماً" },
  { value: "reviews", en: "Most reviewed", ar: "الأكثر مراجعات" },
];

/**
 * Sort control for the catalogue. shadcn `Select` is built on Base UI, so it is
 * controlled with `value` + `onValueChange(value)` (NOT Radix's signature). On
 * change we push a new URL, preserving the active category/period via `params`.
 */
export function SortSelect({
  value,
  params = {},
}: {
  value: SortKey;
  /** Other query params to carry across (e.g. category, period). */
  params?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const onValueChange = (next: SortKey | null) => {
    const key = next ?? "rank";
    const sp = new URLSearchParams(params);
    if (key === "rank") sp.delete("sort");
    else sp.set("sort", key);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const currentLabel = OPTIONS.find((o) => o.value === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" className="w-[190px]" aria-label={isAr ? "ترتيب المنتجات" : "Sort products"}>
        <span className="text-muted-foreground">{isAr ? "ترتيب:" : "Sort:"}</span>
        <SelectValue>
          {(_v: SortKey | null) =>
            isAr
              ? (currentLabel?.ar ?? OPTIONS[0].ar)
              : (currentLabel?.en ?? OPTIONS[0].en)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {isAr ? o.ar : o.en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
