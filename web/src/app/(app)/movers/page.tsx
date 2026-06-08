import { Activity, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { CalibrationNotice } from "@/components/app/calibration-notice";
import { RankRow } from "@/components/app/rank-row";
import { Freshness } from "@/components/app/freshness";
import { PeriodTabs } from "@/components/app/period-tabs";
import { ConfidenceBadge } from "@/components/app/confidence";
import { getMovers, getDashboardSummary } from "@/lib/data";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import type { Period } from "@/lib/types";
import { CategoryFilter } from "./_components/category-filter";

const PERIODS = ["daily", "weekly", "monthly"];

const PERIOD_WINDOW: Record<Period, string> = {
  daily: "the last day",
  weekly: "the last 7 days",
  monthly: "the last 30 days",
};

export default async function MoversPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const period = (PERIODS.includes(sp.period ?? "") ? sp.period : "daily") as Period;
  const category =
    sp.category && CATEGORY_BY_NODE[sp.category] ? sp.category : undefined;

  const rows = getMovers({ categoryNode: category, period });
  const lastUpdated = getDashboardSummary(period).lastUpdated;
  const categoryName = category ? CATEGORY_BY_NODE[category]?.nameEn : undefined;

  // Preserve the active category when the period tabs navigate.
  const periodParams = category ? { category } : undefined;

  return (
    <>
      <PageHeader
        title="Movers & Shakers"
        description="Products climbing the ranks on amazon.eg — sorted by how fast their Best Seller Rank is improving, not by absolute position."
      >
        <PeriodTabs value={period} params={periodParams} />
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-card">
        <CategoryFilter value={category} period={period} />
        <Freshness iso={lastUpdated} />
      </div>

      <CalibrationNotice />

      <Card className="gap-0">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground"
              >
                <TrendingUp className="size-4.5" />
              </span>
              <CardTitle className="truncate text-base font-semibold">
                {categoryName ? `${categoryName} — rising now` : "Rising now"}
              </CardTitle>
              <span className="text-xs font-medium text-positive">
                Biggest rank gains
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ConfidenceBadge
                confidence="medium"
                note="Ranked by Δlog(BSR) over the period — a relative velocity signal, not a units-sold count."
              />
              <Badge variant="success" className="tabular-nums">
                {rows.length} rising
              </Badge>
            </div>
          </div>
          <CardDescription className="flex items-start gap-1.5">
            <Activity className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>
              &ldquo;Rising&rdquo; means improving rank velocity over{" "}
              {PERIOD_WINDOW[period]} — the change in log Best Seller Rank
              (Δlog&nbsp;BSR). It is the most defensible signal we ship: it
              measures direction and pace of movement, never exact sales.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {rows.length ? (
            rows.map((row) => <RankRow key={row.product.asin} row={row} />)
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-2 py-12 text-center">
              <TrendingUp className="size-6 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                Nothing is rising in this window
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                No tracked
                {categoryName ? ` ${categoryName} ` : " "}
                product improved its rank over {PERIOD_WINDOW[period]}. Try a
                longer period or a different category.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
