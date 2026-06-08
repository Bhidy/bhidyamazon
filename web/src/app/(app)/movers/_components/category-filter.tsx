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

  const items: Record<string, string> = {
    [ALL]: "All categories",
    ...Object.fromEntries(CATEGORIES.map((c) => [c.nodeId, c.nameEn])),
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
        aria-label="Filter by category"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All categories</SelectItem>
        {CATEGORIES.map((c) => (
          <SelectItem key={c.nodeId} value={c.nodeId}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>{c.nameEn}</span>
              <span dir="rtl" className="font-arabic text-muted-foreground">
                {c.nameAr}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
