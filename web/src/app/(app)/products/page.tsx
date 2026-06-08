import { Boxes, PackageOpen } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Freshness } from "@/components/app/freshness";
import { PeriodTabs } from "@/components/app/period-tabs";
import { ButtonLink } from "@/components/app/button-link";
import { getBestSellers, getDashboardSummary } from "@/lib/data";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { Period, RankingRow } from "@/lib/types";
import { CategoryFilter } from "./_components/category-filter";
import { SortSelect, type SortKey } from "./_components/sort-select";
import { ProductCard } from "./_components/product-card";

const PERIODS: Period[] = ["daily", "weekly", "monthly"];
const SORTS: SortKey[] = ["rank", "price-asc", "price-desc", "rating", "reviews"];

/** Reorder rows by the chosen sort. `rank` keeps the data layer's BSR ordering. */
function sortRows(rows: RankingRow[], sort: SortKey): RankingRow[] {
  if (sort === "rank") return rows;
  const copy = [...rows];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => (a.product.priceEgp ?? Infinity) - (b.product.priceEgp ?? Infinity));
    case "price-desc":
      return copy.sort((a, b) => (b.product.priceEgp ?? -Infinity) - (a.product.priceEgp ?? -Infinity));
    case "rating":
      return copy.sort((a, b) => (b.product.rating ?? 0) - (a.product.rating ?? 0));
    case "reviews":
      return copy.sort((a, b) => (b.product.reviewCount ?? 0) - (a.product.reviewCount ?? 0));
    default:
      return copy;
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; period?: string }>;
}) {
  const sp = await searchParams;

  const category = sp.category && CATEGORY_BY_NODE[sp.category] ? sp.category : undefined;
  const period = (PERIODS.includes(sp.period as Period) ? sp.period : "daily") as Period;
  const sort = (SORTS.includes(sp.sort as SortKey) ? sp.sort : "rank") as SortKey;

  const rows = sortRows(getBestSellers({ categoryNode: category, period }), sort);

  // Params each control must preserve when it builds its own links.
  const carried: Record<string, string> = {};
  if (category) carried.category = category;
  if (period !== "daily") carried.period = period;
  if (sort !== "rank") carried.sort = sort;

  const categoryName = category ? CATEGORY_BY_NODE[category]?.nameEn : undefined;
  const lastUpdated = getDashboardSummary(period).lastUpdated;
  const count = rows.length;

  return (
    <>
      <PageHeader title="Products" description="Every product Rasid is tracking on amazon.eg.">
        <PeriodTabs value={period} params={omit(carried, "period")} />
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Freshness iso={lastUpdated} />
        <ButtonLink href="/calculator" variant="outline" size="sm">
          <Boxes className="size-4" />
          Run a profit check
        </ButtonLink>
      </div>



      <div className="flex flex-col gap-3">
        <CategoryFilter active={category} params={omit(carried, "category")} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold tabular-nums text-foreground">{formatNumber(count)}</span>{" "}
            {count === 1 ? "product" : "products"}
            {categoryName ? (
              <>
                {" in "}
                <span className="font-medium text-foreground">{categoryName}</span>
              </>
            ) : (
              " tracked"
            )}
          </p>
          <SortSelect value={sort} params={omit(carried, "sort")} />
        </div>
      </div>

      {count ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <ProductCard key={row.product.asin} row={row} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card py-16 text-center shadow-card">
          <span
            aria-hidden
            className="grid size-12 place-items-center rounded-2xl bg-accent text-brand-foreground"
          >
            <PackageOpen className="size-6" />
          </span>
          <p className="text-sm font-semibold text-foreground">No products tracked here yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {categoryName
              ? `Rasid isn't tracking anything in ${categoryName} on amazon.eg right now.`
              : "Nothing is being tracked for this view yet."}
          </p>
          {category && (
            <ButtonLink href="/products" variant="outline" size="sm" className="mt-1">
              Clear category filter
            </ButtonLink>
          )}
        </div>
      )}
    </>
  );
}

/** Drop a key from a carried-params record so a control doesn't echo its own param. */
function omit(obj: Record<string, string>, key: string): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
}
