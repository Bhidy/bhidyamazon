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
import { RankRow } from "@/components/app/rank-row";
import { ConfidenceBadge } from "@/components/app/confidence";
import { getBestSellers, getDashboardSummary } from "@/lib/data";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { Period } from "@/lib/types";
import { CategoryFilter } from "./_components/category-filter";

const PERIODS = ["daily", "weekly", "monthly"];

const PERIOD_LABEL_EN: Record<Period, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};
const PERIOD_LABEL_AR: Record<Period, string> = {
  daily: "اليوم",
  weekly: "هذا الأسبوع",
  monthly: "هذا الشهر",
};

export default async function BestSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; category?: string }>;
}) {
  const sp = await searchParams;

  const period = (PERIODS.includes(sp.period ?? "") ? sp.period : "daily") as Period;
  const category =
    sp.category && CATEGORY_BY_NODE[sp.category] ? sp.category : undefined;

  const rows = getBestSellers({ categoryNode: category, period });
  const activeCategory = category ? CATEGORY_BY_NODE[category] : undefined;

  const freshnessIso = rows[0]?.product.lastSeenAt ?? getDashboardSummary(period).lastUpdated;

  const scopeLabelEn = activeCategory ? activeCategory.nameEn : "all categories";
  const scopeLabelAr = activeCategory ? activeCategory.nameAr : "جميع الفئات";

  return (
    <>
      <PageHeader
        title={
          <>
            <span data-bi-en="">Best Sellers</span>
            <span data-bi-ar="">الأكثر مبيعاً</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">The highest-ranking products on amazon.eg by Best Seller Rank — tracked over time and labelled as relative, not exact, signals.</span>
            <span data-bi-ar="">أعلى المنتجات ترتيباً في amazon.eg حسب ترتيب الأكثر مبيعاً — متتبع بمرور الوقت ومُصنَّف كمؤشرات نسبية.</span>
          </>
        }
      >
        <PeriodTabs value={period} params={category ? { category } : {}} />
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-card">
        <Freshness iso={freshnessIso} />
        <span className="text-xs text-muted-foreground">
          <span data-bi-en="">Ranked best sellers across {scopeLabelEn} · {PERIOD_LABEL_EN[period]}</span>
          <span data-bi-ar="">أفضل المنتجات مبيعاً في {scopeLabelAr} · {PERIOD_LABEL_AR[period]}</span>
        </span>
      </div>

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
              <span data-bi-en="">{activeCategory ? activeCategory.nameEn : "All categories"}</span>
              <span data-bi-ar="">{activeCategory ? activeCategory.nameAr : "جميع الفئات"}</span>
            </CardTitle>
            {activeCategory && (
              <span
                dir="rtl"
                className="truncate font-arabic text-sm text-muted-foreground"
                data-bi-en=""
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
            <span data-bi-en="">{formatNumber(rows.length)} {rows.length === 1 ? "product" : "products"}</span>
            <span data-bi-ar="">{formatNumber(rows.length)} {rows.length === 1 ? "منتج" : "منتجات"}</span>
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
                <span data-bi-en="">No best sellers in {scopeLabelEn}</span>
                <span data-bi-ar="">لا يوجد أفضل منتجات مبيعاً في {scopeLabelAr}</span>
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                <span data-bi-en="">We have not tracked ranked products for this category yet. Try another category or switch the period.</span>
                <span data-bi-ar="">لم نتتبع منتجات مرتبة في هذه الفئة بعد. جرب فئة أخرى أو غيّر الفترة الزمنية.</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
