import {
  ArrowRight,
  Boxes,
  Calculator,
  Layers,
  Radar,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ButtonLink } from "@/components/app/button-link";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { CalibrationNotice } from "@/components/app/calibration-notice";
import { RankRow } from "@/components/app/rank-row";
import { Freshness } from "@/components/app/freshness";
import { PeriodTabs } from "@/components/app/period-tabs";
import { ConfidenceBadge } from "@/components/app/confidence";
import { DemandTrendChip } from "@/components/app/demand-trend-chip";
import { getDashboardSummary } from "@/lib/data";
import { formatRating } from "@/lib/format";
import type { Period } from "@/lib/types";
import { DashboardHero } from "./_components/dashboard-hero";

const PERIODS = ["daily", "weekly", "monthly"];

/**
 * Ordinal autocomplete-prominence tier for the Demand radar card. The keyword
 * `demandScore` is a re-encoding of a term's POSITION in Amazon autocomplete,
 * not a magnitude — so we surface a WORD (Top / High / Medium), never a 0–100
 * number that could be misread as a demand quantity.
 */
function prominenceTier(score: number): { label: string; cls: string } {
  if (score >= 100) return { label: "Top", cls: "text-brand-foreground border-brand/30 bg-brand/20" };
  if (score >= 84) return { label: "High", cls: "text-muted-foreground border-border bg-muted/40" };
  return { label: "Medium", cls: "text-muted-foreground border-border bg-muted/40" };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = (PERIODS.includes(sp.period ?? "") ? sp.period : "daily") as Period;
  const s = getDashboardSummary(period);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="What's selling and rising on amazon.eg right now — ranked, tracked over time, and honestly labelled."
      >
        <PeriodTabs value={period} />
      </PageHeader>

      <DashboardHero summary={s} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Freshness iso={s.lastUpdated} />
        <ButtonLink href="/calculator" variant="outline" size="sm">
          <Calculator className="size-4" />
          Run a profit check
        </ButtonLink>
      </div>

      <CalibrationNotice />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Products tracked" value={s.productsTracked} icon={Boxes} hint="Across amazon.eg categories" />
        <KpiCard
          label={`Rising (${period})`}
          value={s.risingCount}
          icon={TrendingUp}
          footer={<span className="text-positive">Improving rank velocity</span>}
        />
        <KpiCard label="Avg rating" value={formatRating(s.avgRating)} icon={Star} hint="Weighted across tracked items" />
        <KpiCard label="Categories" value={s.categoriesTracked} icon={Layers} hint="Best-seller lists monitored" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader className="flex-row items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-positive" />
              <CardTitle className="text-base">Rising now</CardTitle>
            </div>
            <ButtonLink href="/movers" variant="ghost" size="sm" className="text-muted-foreground">
              All movers <ArrowRight className="size-3.5" />
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-2">
            {s.topRisers.length ? (
              s.topRisers.map((row) => <RankRow key={row.product.asin} row={row} />)
            ) : (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No rising products in this window.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="flex-row items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-confidence-medium" />
              <CardTitle className="text-base">Best sellers</CardTitle>
            </div>
            <ButtonLink href="/bestsellers" variant="ghost" size="sm" className="text-muted-foreground">
              All best sellers <ArrowRight className="size-3.5" />
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-2">
            {s.topBestSellers.map((row) => (
              <RankRow key={row.product.asin} row={row} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radar className="size-4 text-brand" />
              <CardTitle className="text-base">Demand radar</CardTitle>
              <ConfidenceBadge confidence="low" note="How prominently amazon.eg suggests the term in autocomplete — an ordinal signal, not search volume." />
            </div>
            <ButtonLink href="/keywords" variant="ghost" size="sm" className="text-muted-foreground">
              Full radar <ArrowRight className="size-3.5" />
            </ButtonLink>
          </div>
          <CardDescription>Autocomplete prominence (how prominently Amazon suggests the term) — not search volume or demand quantity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2.5 sm:grid-cols-2">
          {s.topKeywords.map((k) => {
            const tier = prominenceTier(k.demandScore);
            return (
              <div key={k.query} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium" dir={k.lang === "ar" ? "rtl" : "ltr"}>
                      {k.query}
                    </span>
                    <DemandTrendChip trend={k.trend} />
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="meter"
                    aria-valuenow={k.demandScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Autocomplete prominence: ${tier.label} (rank signal, not search volume)`}
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${k.demandScore}%` }} />
                  </div>
                </div>
                <span
                  className={`inline-flex w-14 shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium leading-none ${tier.cls}`}
                >
                  {tier.label}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
