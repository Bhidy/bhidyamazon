"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortKey = "rank" | "price-asc" | "price-desc" | "rating" | "reviews";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rank", label: "Best Seller Rank" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "reviews", label: "Most reviewed" },
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

  const onValueChange = (next: SortKey | null) => {
    const key = next ?? "rank";
    const sp = new URLSearchParams(params);
    if (key === "rank") sp.delete("sort");
    else sp.set("sort", key);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" className="w-[190px]" aria-label="Sort products">
        <span className="text-muted-foreground">Sort:</span>
        <SelectValue>
          {(v: SortKey | null) =>
            OPTIONS.find((o) => o.value === v)?.label ?? OPTIONS[0].label
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
