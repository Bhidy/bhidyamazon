import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  Boxes,
  Gauge,
  MessageSquareQuote,
  Minus,
  PackageCheck,
  PackageX,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ButtonLink } from "@/components/app/button-link";
import { KpiCard } from "@/components/app/kpi-card";
import { ProductThumb } from "@/components/app/product-thumb";
import { RatingStars } from "@/components/app/rating-stars";
import { DemandBadge, TrendIndicator } from "@/components/app/badges";
import { ConfidenceBadge, ProvenanceHint } from "@/components/app/confidence";
import { Freshness } from "@/components/app/freshness";
import {
  getBestSellers,
  getBsrHistory,
  getMovers,
  getProduct,
  getReviews,
  getSentimentSummary,
} from "@/lib/data";
import { DEMAND_BAND_META, DISCLOSURE } from "@/lib/constants";
import { computeReferralFee, getReferralRule } from "@/lib/fees";
import {
  formatDate,
  formatEgp,
  formatNumber,
  formatPct,
  formatRank,
  formatRating,
} from "@/lib/format";
import type { Review, ReviewLang, SentimentLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HistoryChart, type HistoryPoint } from "./_components/history-chart";
import { WatchButton } from "./_components/watch-button";

const PERIODS = ["daily", "weekly", "monthly"] as const;

const LANG_LABEL_EN: Record<ReviewLang, string> = {
  ar: "Arabic",
  en: "English",
  mixed: "Mixed",
  unknown: "Unknown",
};
const LANG_LABEL_AR: Record<ReviewLang, string> = {
  ar: "العربية",
  en: "الإنجليزية",
  mixed: "مختلط",
  unknown: "غير معروف",
};

const SENTIMENT_META: Record<
  SentimentLabel,
  { labelEn: string; labelAr: string; cls: string }
> = {
  positive: { labelEn: "Positive", labelAr: "إيجابي", cls: "text-positive border-positive/30 bg-positive/10" },
  neutral: { labelEn: "Neutral", labelAr: "محايد", cls: "text-muted-foreground border-border bg-muted" },
  negative: { labelEn: "Negative", labelAr: "سلبي", cls: "text-negative border-negative/30 bg-negative/10" },
};

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ asin: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { asin } = await params;
  const sp = await searchParams;
  const period = (PERIODS as readonly string[]).includes(sp.period ?? "")
    ? (sp.period as (typeof PERIODS)[number])
    : "daily";

  const product = getProduct(asin, period);
  if (!product) notFound();

  const history = getBsrHistory(asin);
  const reviews = getReviews(asin, {});
  const sentiment = getSentimentSummary(asin);

  const moverRow = getMovers({ period }).find((r) => r.product.asin === asin);
  const bandRow = getBestSellers({ categoryNode: product.categoryNode, period }).find(
    (r) => r.product.asin === asin,
  );
  const riseScore = moverRow?.riseScore ?? 0;
  const gainPct = moverRow?.gainPct ?? 0;
  const demandBand = bandRow?.demandBand ?? moverRow?.demandBand ?? "unknown";
  const bandMeta = DEMAND_BAND_META[demandBand];

  const points: HistoryPoint[] = history.points.map((pt, i) => ({
    date: pt.date,
    bsr: pt.value,
    price: history.pricePoints[i]?.value ?? null,
  }));

  const referralRule = getReferralRule(product.categoryNode);
  const referralFee =
    product.priceEgp != null ? computeReferralFee(product.priceEgp, referralRule) : null;

  const analysed = sentiment.analysedCount;
  const reported = Math.max(sentiment.totalReported, analysed);
  const coveragePct = reported > 0 ? (analysed / reported) * 100 : 0;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              <span data-bi-en="">Dashboard</span>
              <span data-bi-ar="">لوحة التحكم</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/bestsellers" />}>
              <span data-bi-en="">Products</span>
              <span data-bi-ar="">المنتجات</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[60vw] truncate sm:max-w-none">
              {product.titleEn}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ─────────────────────────── Header ─────────────────────────── */}
      <Card className="gap-0 shadow-card-lg">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-6 sm:p-6">
          <div className="self-start rounded-2xl bg-accent/50 p-2.5">
            <ProductThumb product={product} size={96} />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {product.asin}
                </span>
                {product.categoryName && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Boxes className="size-3.5" />
                    {product.categoryName}
                  </span>
                )}
                <ProvenanceHint provenance={product.provenance} />
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {product.titleEn}
              </h1>
              {product.titleAr && (
                <p dir="rtl" className="font-arabic text-base text-muted-foreground">
                  {product.titleAr}
                </p>
              )}
              {product.brand && (
                <p className="text-sm text-muted-foreground">
                  <span data-bi-en="">by </span>
                  <span data-bi-ar="">بواسطة </span>
                  <span className="font-medium text-foreground">{product.brand}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-primary sm:text-4xl">
                  {formatEgp(product.priceEgp)}
                </span>
                <ConfidenceBadge confidence="high" note="Observed list price on amazon.eg." />
              </span>
              <Separator orientation="vertical" className="h-6" />
              <RatingStars rating={product.rating} count={product.reviewCount} size={16} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DemandBadge band={demandBand} />
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                <Activity className="size-3.5" />
                BSR {formatRank(product.bsr)}
              </span>
              {product.inStock ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-2 py-0.5 text-xs font-medium text-positive">
                  <PackageCheck className="size-3.5" />
                  <span data-bi-en="">In stock</span>
                  <span data-bi-ar="">متوفر</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <PackageX className="size-3.5" />
                  <span data-bi-en="">Out of stock</span>
                  <span data-bi-ar="">غير متوفر</span>
                </span>
              )}
              <Freshness iso={product.lastSeenAt ?? product.provenance.fetchedAt} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-44">
            <ButtonLink
              href={`/calculator?price=${product.priceEgp ?? ""}&category=${
                product.categoryNode === "unknown" ? "" : product.categoryNode
              }`}
              className="w-full"
            >
              <Gauge className="size-4" />
              <span data-bi-en="">Check profit</span>
              <span data-bi-ar="">فحص الربح</span>
            </ButtonLink>
            <WatchButton product={product} />
            {referralFee != null && product.categoryNode !== "unknown" && (
              <p className="text-center text-[11px] leading-snug text-muted-foreground">
                <span data-bi-en="">Est. referral fee ≈ </span>
                <span data-bi-ar="">رسوم الإحالة التقديرية ≈ </span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatEgp(referralFee)}
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────── Key signals (KPI row) ─────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={<><span data-bi-en="">Relative demand</span><span data-bi-ar="">الطلب النسبي</span></>}
          value={
            <>
              <span data-bi-en="">{bandMeta.labelEn}</span>
              <span data-bi-ar="">{bandMeta.labelAr}</span>
            </>
          }
          icon={Gauge}
          footer={
            <span className="text-muted-foreground">
              <span data-bi-en="">{DISCLOSURE.ordinalEn}</span>
              <span data-bi-ar="">الترتيب قابل للمقارنة فقط ضمن نفس الفئة في amazon.eg.</span>
            </span>
          }
        />
        <KpiCard
          label={<><span data-bi-en="">Rank velocity</span><span data-bi-ar="">سرعة الترتيب</span></>}
          value={<TrendIndicator value={gainPct} invert={false} />}
          icon={riseScore > 0 ? TrendingUp : riseScore < 0 ? TrendingDown : Minus}
          footer={
            <span className="text-muted-foreground">
              {riseScore > 0 ? (
                <>
                  <span data-bi-en="">Improving vs last window</span>
                  <span data-bi-ar="">تحسن مقارنة بالفترة الماضية</span>
                </>
              ) : riseScore < 0 ? (
                <>
                  <span data-bi-en="">Slipping vs last window</span>
                  <span data-bi-ar="">تراجع مقارنة بالفترة الماضية</span>
                </>
              ) : (
                <>
                  <span data-bi-en="">Holding steady</span>
                  <span data-bi-ar="">مستقر</span>
                </>
              )}
            </span>
          }
        />
        <KpiCard
          label={<><span data-bi-en="">Reviews</span><span data-bi-ar="">المراجعات</span></>}
          value={formatNumber(product.reviewCount)}
          icon={MessageSquareQuote}
          hint={<><span data-bi-en="">Total reported on the listing</span><span data-bi-ar="">الإجمالي المُبلَّغ عنه</span></>}
        />
        <KpiCard
          label={<><span data-bi-en="">Avg rating</span><span data-bi-ar="">متوسط التقييم</span></>}
          value={formatRating(product.rating)}
          icon={Star}
          hint={<><span data-bi-en="">Listing star average</span><span data-bi-ar="">متوسط نجوم القائمة</span></>}
        />
      </div>

      {/* ───────────────────── Rank & price history ──────────────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground"
              >
                <Activity className="size-4" />
              </span>
              <CardTitle className="text-base">
                {history.points.length >= 2 ? (
                  <>
                    <span data-bi-en="">Rank &amp; price history (90 days)</span>
                    <span data-bi-ar="">تاريخ الترتيب والسعر (90 يوماً)</span>
                  </>
                ) : (
                  <>
                    <span data-bi-en="">Rank &amp; price history — tracking just started (1 snapshot)</span>
                    <span data-bi-ar="">تاريخ الترتيب والسعر — التتبع بدأ للتو (لقطة واحدة)</span>
                  </>
                )}
              </CardTitle>
              <ConfidenceBadge
                confidence="medium"
                note="Time-series built from our own daily snapshots, not Amazon's historical data."
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-3.5 rounded-full bg-chart-1" />
                <span data-bi-en="">BSR (rank)</span>
                <span data-bi-ar="">BSR (الترتيب)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-3.5 rounded-full bg-chart-2" />
                <span data-bi-en="">Price</span>
                <span data-bi-ar="">السعر</span>
              </span>
            </div>
          </div>
          <CardDescription className="mt-1">
            <span data-bi-en="">
              History starts the day we began tracking this ASIN — it builds up over time
              from zero coverage, so early gaps are expected. Rank axis is inverted (up = better).
            </span>
            <span data-bi-ar="">
              يبدأ التاريخ من يوم بدأنا تتبع هذا ASIN — يتراكم بمرور الوقت من صفر، لذا الفجوات الأولى متوقعة. محور الترتيب معكوس (أعلى = أفضل).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-4">
          <HistoryChart data={points} />
          <div className="mt-2 flex items-center justify-end">
            <ProvenanceHint provenance={history.provenance} />
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────── Review intelligence ───────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Sentiment summary */}
        <Card className="gap-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="size-4 text-brand" />
              <CardTitle className="text-base">
                <span data-bi-en="">Review intelligence</span>
                <span data-bi-ar="">تحليل المراجعات</span>
              </CardTitle>
              <ConfidenceBadge
                confidence="low"
                note={sentiment.provenance.note ?? "Sentiment is modeled on a logged-out review sample."}
              />
            </div>
            <CardDescription className="mt-1">
              <span data-bi-en="">
                Based on{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatNumber(analysed)}
                </span>{" "}
                of{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatNumber(reported)}
                </span>{" "}
                reported reviews ({formatPct(coveragePct, "en", { decimals: 0 })} sampled).
              </span>
              <span data-bi-ar="">
                بناءً على{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatNumber(analysed)}
                </span>{" "}
                من{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatNumber(reported)}
                </span>{" "}
                مراجعة مُبلَّغ عنها ({formatPct(coveragePct, "en", { decimals: 0 })} مُختارة).
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {/* Stacked sentiment split */}
            <div className="space-y-2">
              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`Sentiment split: ${sentiment.positivePct}% positive, ${sentiment.neutralPct}% neutral, ${sentiment.negativePct}% negative`}
              >
                <div className="h-full bg-positive" style={{ width: `${sentiment.positivePct}%` }} />
                <div
                  className="h-full bg-muted-foreground/50"
                  style={{ width: `${sentiment.neutralPct}%` }}
                />
                <div className="h-full bg-negative" style={{ width: `${sentiment.negativePct}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <SplitLegend tone="positive" labelEn="Positive" labelAr="إيجابي" pct={sentiment.positivePct} />
                <SplitLegend tone="neutral" labelEn="Neutral" labelAr="محايد" pct={sentiment.neutralPct} />
                <SplitLegend tone="negative" labelEn="Negative" labelAr="سلبي" pct={sentiment.negativePct} />
              </div>
            </div>

            {/* Language mix */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                <span data-bi-en="">Language mix</span>
                <span data-bi-ar="">مزيج اللغات</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(sentiment.langMix) as [ReviewLang, number][])
                  .filter(([, n]) => n > 0)
                  .map(([lang, n]) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      <span data-bi-en="">{LANG_LABEL_EN[lang]}</span>
                      <span data-bi-ar="">{LANG_LABEL_AR[lang]}</span>
                      <span className="font-medium tabular-nums text-foreground">{n}</span>
                    </span>
                  ))}
              </div>
            </div>

            <Separator />

            {/* Pros / Cons */}
            <div className="space-y-4">
              <AspectGroup
                titleEn="What buyers like"
                titleAr="ما يعجب المشترين"
                icon={<ThumbsUp className="size-4 text-positive" />}
                aspects={sentiment.pros}
                tone="positive"
                emptyLabelEn="No positive aspects surfaced in the sample."
                emptyLabelAr="لم تظهر جوانب إيجابية في العينة."
              />
              <AspectGroup
                titleEn="Common complaints"
                titleAr="الشكاوى الشائعة"
                icon={<ThumbsDown className="size-4 text-negative" />}
                aspects={sentiment.cons}
                tone="negative"
                emptyLabelEn="No recurring complaints in the sample."
                emptyLabelAr="لا شكاوى متكررة في العينة."
              />
            </div>

            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <span aria-hidden>⚠</span>
              <span data-bi-en="">
                Reviews are a truncated logged-out sample; treat themes as directional, not exhaustive.
              </span>
              <span data-bi-ar="">
                المراجعات عينة مقتطعة بدون تسجيل دخول؛ تعامل مع الموضوعات كمؤشرات توجيهية لا شاملة.
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Individual reviews */}
        <Card className="gap-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                <span data-bi-en="">Reviews</span>
                <span data-bi-ar="">المراجعات</span>
                <span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">
                  {formatNumber(reviews.length)}{" "}
                  <span data-bi-en="">shown</span>
                  <span data-bi-ar="">معروضة</span>
                </span>
              </CardTitle>
              <ConfidenceBadge confidence="medium" note="Individual review text as scraped." />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {reviews.length ? (
              <ul className="divide-y divide-border">
                {reviews.map((review) => (
                  <ReviewItem key={review.reviewId} review={review} langLabels={LANG_LABEL_EN} sentimentMeta={SENTIMENT_META} />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                <span data-bi-en="">No reviews captured for this product yet.</span>
                <span data-bi-ar="">لم يتم التقاط مراجعات لهذا المنتج بعد.</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/* ───────────────────────────── sub-components ──────────────────────────── */

function SplitLegend({
  tone,
  labelEn,
  labelAr,
  pct,
}: {
  tone: "positive" | "neutral" | "negative";
  labelEn: string;
  labelAr: string;
  pct: number;
}) {
  const dot =
    tone === "positive" ? "bg-positive" : tone === "negative" ? "bg-negative" : "bg-muted-foreground/50";
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="text-muted-foreground">
        <span data-bi-en="">{labelEn}</span>
        <span data-bi-ar="">{labelAr}</span>
      </span>
      <span className="ml-auto font-medium tabular-nums text-foreground">
        {formatPct(pct, "en", { decimals: 0 })}
      </span>
    </div>
  );
}

function AspectGroup({
  titleEn,
  titleAr,
  icon,
  aspects,
  tone,
  emptyLabelEn,
  emptyLabelAr,
}: {
  titleEn: string;
  titleAr: string;
  icon: React.ReactNode;
  aspects: { aspect: string; quote?: string }[];
  tone: "positive" | "negative";
  emptyLabelEn: string;
  emptyLabelAr: string;
}) {
  const accent = tone === "positive" ? "border-l-positive/50" : "border-l-negative/50";
  const seen = new Set<string>();
  const unique = aspects.filter((a) => {
    if (seen.has(a.aspect)) return false;
    seen.add(a.aspect);
    return true;
  });
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}
        <span data-bi-en="">{titleEn}</span>
        <span data-bi-ar="">{titleAr}</span>
      </p>
      {unique.length ? (
        <ul className="space-y-2">
          {unique.map((a) => (
            <li
              key={a.aspect}
              className={cn("rounded-md border-l-2 bg-muted/40 px-3 py-2", accent)}
            >
              <p className="text-xs font-medium text-foreground">{a.aspect}</p>
              {a.quote && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  &ldquo;{a.quote}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          <span data-bi-en="">{emptyLabelEn}</span>
          <span data-bi-ar="">{emptyLabelAr}</span>
        </p>
      )}
    </div>
  );
}

function ReviewItem({
  review,
  sentimentMeta,
}: {
  review: Review;
  langLabels: Record<ReviewLang, string>;
  sentimentMeta: Record<SentimentLabel, { labelEn: string; labelAr: string; cls: string }>;
}) {
  const isAr = review.lang === "ar";
  const sentiment = review.sentiment ? sentimentMeta[review.sentiment] : null;
  return (
    <li className="space-y-2 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars rating={review.rating} size={13} showValue={false} />
            {review.title && (
              <span
                dir={isAr ? "rtl" : "ltr"}
                className={cn("truncate text-sm font-medium text-foreground", isAr && "font-arabic")}
              >
                {review.title}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{review.authorName}</span>
            {review.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-positive">
                <BadgeCheck className="size-3.5" />
                <span data-bi-en="">Verified purchase</span>
                <span data-bi-ar="">عملية شراء موثقة</span>
              </span>
            )}
            <span aria-hidden>·</span>
            <span className="tabular-nums">{formatDate(review.reviewedAt)}</span>
          </div>
        </div>
        {sentiment && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
              sentiment.cls,
            )}
          >
            <span data-bi-en="">{sentiment.labelEn}</span>
            <span data-bi-ar="">{sentiment.labelAr}</span>
          </span>
        )}
      </div>

      <p
        dir={isAr ? "rtl" : "ltr"}
        className={cn("text-sm leading-relaxed text-foreground/90", isAr && "font-arabic text-end")}
      >
        {review.body}
      </p>

      {review.helpfulVotes != null && review.helpfulVotes > 0 && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp className="size-3" />
          <span data-bi-en="">{formatNumber(review.helpfulVotes)} found this helpful</span>
          <span data-bi-ar="">وجده {formatNumber(review.helpfulVotes)} مفيداً</span>
        </p>
      )}
    </li>
  );
}
