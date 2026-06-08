import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { PeriodTabs } from "@/components/app/period-tabs";
import { Freshness } from "@/components/app/freshness";
import { CalibrationNotice } from "@/components/app/calibration-notice";
import { RankRow } from "@/components/app/rank-row";
import { ConfidenceBadge } from "@/components/app/confidence";
import { getBestSellers, getDashboardSummary } from "@/lib/data";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { Period } from "@/lib/types";
import { CategoryFilter } from "./_components/category-filter";

const PERIODS = ["daily", "weekly", "monthly"];

const PERIOD_LABEL: Record<Period, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};

export default async function BestSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; category?: string }>;
}) {
  const sp = await searchParams;

  const period = (PERIODS.includes(sp.period ?? "") ? sp.period : "daily") as Period;
  // A valid category is a known CATEGORIES nodeId; anything else means "all".
  const category =
    sp.category && CATEGORY_BY_NODE[sp.category] ? sp.category : undefined;

  const rows = getBestSellers({ categoryNode: category, period });
  const activeCategory = category ? CATEGORY_BY_NODE[category] : undefined;

  // Freshness: prefer the snapshot time on a returned product; fall back to the
  // dashboard's last-updated marker when the (filtered) list is empty.
  const freshnessIso = rows[0]?.product.lastSeenAt ?? getDashboardSummary(period).lastUpdated;

  const scopeLabel = activeCategory ? activeCategory.nameEn : "all categories";

  return (
    <>
      <PageHeader
        title="Best Sellers"
        description="The highest-ranking products on amazon.eg by Best Seller Rank — tracked over time and labelled as relative, not exact, signals."
      >
        <PeriodTabs value={period} params={category ? { category } : {}} />
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-card">
        <Freshness iso={freshnessIso} />
        <span className="text-xs text-muted-foreground">
          Ranked best sellers across {scopeLabel} · {PERIOD_LABEL[period]}
        </span>
      </div>

      <CalibrationNotice />

      <CategoryFilter period={period} active={category} />

      <Card className="gap-0">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground"
            >
              <Trophy className="size-4.5" />
            </span>
            <CardTitle className="truncate text-base font-semibold">
              {activeCategory ? activeCategory.nameEn : "All categories"}
            </CardTitle>
            {activeCategory && (
              <span
                dir="rtl"
                className="truncate font-arabic text-sm text-muted-foreground"
              >
                {activeCategory.nameAr}
              </span>
            )}
            <ConfidenceBadge
              confidence="medium"
              note="Rank is comparable only within the same category on amazon.eg."
            />
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {formatNumber(rows.length)} {rows.length === 1 ? "product" : "products"}
          </Badge>
        </CardHeader>
        <CardContent className="p-2">
          {rows.length ? (
            rows.map((row) => <RankRow key={row.product.asin} row={row} />)
          ) : (
            <div className="px-6 py-14 text-center">
              <span
                aria-hidden
                className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-brand-foreground"
              >
                <Trophy className="size-6" />
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">
                No best sellers in {scopeLabel}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                We have not tracked ranked products for this category yet. Try
                another category or switch the period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
