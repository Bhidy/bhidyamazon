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

function prominenceTier(score: number): { labelEn: string; labelAr: string; cls: string } {
  if (score >= 100) return { labelEn: "Top", labelAr: "الأول", cls: "text-brand-foreground border-brand/30 bg-brand/20" };
  if (score >= 84) return { labelEn: "High", labelAr: "مرتفع", cls: "text-muted-foreground border-border bg-muted/40" };
  return { labelEn: "Medium", labelAr: "متوسط", cls: "text-muted-foreground border-border bg-muted/40" };
}

const PERIOD_LABEL_EN: Record<string, string> = { daily: "daily", weekly: "weekly", monthly: "monthly" };
const PERIOD_LABEL_AR: Record<string, string> = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري" };

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
        title={<><span data-bi-en="">Dashboard</span><span data-bi-ar="">لوحة التحكم</span></>}
        description={
          <>
            <span data-bi-en="">What&apos;s selling and rising on amazon.eg right now — ranked, tracked over time, and honestly labelled.</span>
            <span data-bi-ar="">ما يُباع ويرتفع في amazon.eg الآن — مُرتَّب، متتبع بمرور الوقت، ومُصنَّف بصدق.</span>
          </>
        }
      >
        <PeriodTabs value={period} />
      </PageHeader>

      <DashboardHero summary={s} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Freshness iso={s.lastUpdated} />
        <ButtonLink href="/calculator" variant="outline" size="sm">
          <Calculator className="size-4" />
          <span data-bi-en="">Run a profit check</span>
          <span data-bi-ar="">احسب الربح</span>
        </ButtonLink>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={<><span data-bi-en="">Products tracked</span><span data-bi-ar="">المنتجات المتتبعة</span></>}
          value={s.productsTracked}
          icon={Boxes}
          hint={<><span data-bi-en="">Across amazon.eg categories</span><span data-bi-ar="">عبر فئات amazon.eg</span></>}
        />
        <KpiCard
          label={
            <>
              <span data-bi-en="">Rising ({PERIOD_LABEL_EN[period]})</span>
              <span data-bi-ar="">الصاعدة ({PERIOD_LABEL_AR[period]})</span>
            </>
          }
          value={s.risingCount}
          icon={TrendingUp}
          footer={
            <span className="text-positive">
              <span data-bi-en="">Improving rank velocity</span>
              <span data-bi-ar="">تحسن سرعة الترتيب</span>
            </span>
          }
        />
        <KpiCard
          label={<><span data-bi-en="">Avg rating</span><span data-bi-ar="">متوسط التقييم</span></>}
          value={formatRating(s.avgRating)}
          icon={Star}
          hint={<><span data-bi-en="">Weighted across tracked items</span><span data-bi-ar="">مرجح عبر المنتجات المتتبعة</span></>}
        />
        <KpiCard
          label={<><span data-bi-en="">Categories</span><span data-bi-ar="">الفئات</span></>}
          value={s.categoriesTracked}
          icon={Layers}
          hint={<><span data-bi-en="">Best-seller lists monitored</span><span data-bi-ar="">قوائم الأكثر مبيعاً تحت المراقبة</span></>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader className="flex-row items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-positive" />
              <CardTitle className="text-base">
                <span data-bi-en="">Rising now</span>
                <span data-bi-ar="">الصاعدة الآن</span>
              </CardTitle>
            </div>
            <ButtonLink href="/movers" variant="ghost" size="sm" className="text-muted-foreground">
              <span data-bi-en="">All movers</span>
              <span data-bi-ar="">كل الصاعدة</span>
              {" "}<ArrowRight className="size-3.5" />
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-2">
            {s.topRisers.length ? (
              s.topRisers.map((row) => <RankRow key={row.product.asin} row={row} />)
            ) : (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                <span data-bi-en="">No rising products in this window.</span>
                <span data-bi-ar="">لا توجد منتجات صاعدة في هذه الفترة.</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="flex-row items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-confidence-medium" />
              <CardTitle className="text-base">
                <span data-bi-en="">Best sellers</span>
                <span data-bi-ar="">الأكثر مبيعاً</span>
              </CardTitle>
            </div>
            <ButtonLink href="/bestsellers" variant="ghost" size="sm" className="text-muted-foreground">
              <span data-bi-en="">All best sellers</span>
              <span data-bi-ar="">كل الأكثر مبيعاً</span>
              {" "}<ArrowRight className="size-3.5" />
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
              <CardTitle className="text-base">
                <span data-bi-en="">Demand radar</span>
                <span data-bi-ar="">رادار الطلب</span>
              </CardTitle>
              <ConfidenceBadge
                confidence="low"
                note="How prominently amazon.eg suggests the term in autocomplete — an ordinal signal, not search volume."
              />
            </div>
            <ButtonLink href="/keywords" variant="ghost" size="sm" className="text-muted-foreground">
              <span data-bi-en="">Full radar</span>
              <span data-bi-ar="">الرادار الكامل</span>
              {" "}<ArrowRight className="size-3.5" />
            </ButtonLink>
          </div>
          <CardDescription>
            <span data-bi-en="">Autocomplete prominence (how prominently Amazon suggests the term) — not search volume or demand quantity.</span>
            <span data-bi-ar="">بروز الإكمال التلقائي (مدى اقتراح Amazon للمصطلح) — وليس حجم البحث أو كمية الطلب.</span>
          </CardDescription>
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
                    aria-label={`Autocomplete prominence: ${tier.labelEn} (rank signal, not search volume)`}
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${k.demandScore}%` }} />
                  </div>
                </div>
                <span
                  className={`inline-flex w-14 shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium leading-none ${tier.cls}`}
                >
                  <span data-bi-en="">{tier.labelEn}</span>
                  <span data-bi-ar="">{tier.labelAr}</span>
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
