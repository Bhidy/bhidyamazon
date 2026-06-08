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

const LANG_LABEL: Record<ReviewLang, string> = {
  ar: "Arabic",
  en: "English",
  mixed: "Mixed",
  unknown: "Unknown",
};

/** Sentiment-chip styling, reused for the review list and aspect rows. */
const SENTIMENT_META: Record<
  SentimentLabel,
  { label: string; cls: string }
> = {
  positive: { label: "Positive", cls: "text-positive border-positive/30 bg-positive/10" },
  neutral: { label: "Neutral", cls: "text-muted-foreground border-border bg-muted" },
  negative: { label: "Negative", cls: "text-negative border-negative/30 bg-negative/10" },
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

  // Where this product sits in the movers list → rank-velocity context.
  const moverRow = getMovers({ period }).find((r) => r.product.asin === asin);
  // Demand band comes from the category-relative BEST-SELLER row; movers/velocity is
  // empty until >= 2 daily snapshots accumulate, so never source the band from it.
  const bandRow = getBestSellers({ categoryNode: product.categoryNode, period }).find(
    (r) => r.product.asin === asin,
  );
  const riseScore = moverRow?.riseScore ?? 0;
  const gainPct = moverRow?.gainPct ?? 0;
  const demandBand = bandRow?.demandBand ?? moverRow?.demandBand ?? "unknown";
  const bandMeta = DEMAND_BAND_META[demandBand];

  // Merge the two server series into the chart's row shape on the server, so the
  // client component only receives plain points (no extra data fetching).
  const points: HistoryPoint[] = history.points.map((pt, i) => ({
    date: pt.date,
    bsr: pt.value,
    price: history.pricePoints[i]?.value ?? null,
  }));

  // Indicative referral-fee preview (estimate) — links into the full calculator.
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
            <BreadcrumbLink render={<Link href="/" />}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/bestsellers" />}>Products</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[60vw] truncate sm:max-w-none">
              {product.titleEn}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ─────────────────────────── (a) Header ─────────────────────────── */}
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
                  by <span className="font-medium text-foreground">{product.brand}</span>
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
                  In stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <PackageX className="size-3.5" />
                  Out of stock
                </span>
              )}
              <Freshness iso={product.lastSeenAt ?? product.provenance.fetchedAt} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-44">
            <ButtonLink
              href={`/calculator?price=${product.priceEgp ?? ""}&category=${product.categoryNode}`}
              className="w-full"
            >
              <Gauge className="size-4" />
              Check profit
            </ButtonLink>
            <WatchButton asin={product.asin} title={product.titleEn} />
            {referralFee != null && (
              <p className="text-center text-[11px] leading-snug text-muted-foreground">
                Est. referral fee ≈{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatEgp(referralFee)}
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>



      {/* ───────────────────── (c) Key signals (KPI row) ─────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Relative demand"
          value={bandMeta.labelEn}
          icon={Gauge}
          footer={
            <span className="text-muted-foreground">{DISCLOSURE.ordinalEn}</span>
          }
        />
        <KpiCard
          label="Rank velocity"
          value={<TrendIndicator value={gainPct} invert={false} />}
          icon={riseScore > 0 ? TrendingUp : riseScore < 0 ? TrendingDown : Minus}
          footer={
            <span className="text-muted-foreground">
              {riseScore > 0
                ? "Improving vs last window"
                : riseScore < 0
                  ? "Slipping vs last window"
                  : "Holding steady"}
            </span>
          }
        />
        <KpiCard
          label="Reviews"
          value={formatNumber(product.reviewCount)}
          icon={MessageSquareQuote}
          hint="Total reported on the listing"
        />
        <KpiCard
          label="Avg rating"
          value={formatRating(product.rating)}
          icon={Star}
          hint="Listing star average"
        />
      </div>

      {/* ───────────────────── (b) Rank & price history ──────────────────── */}
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
                {history.points.length >= 2
                  ? "Rank & price history (90 days)"
                  : "Rank & price history — tracking just started (1 snapshot)"}
              </CardTitle>
              <ConfidenceBadge
                confidence="medium"
                note="Time-series built from our own daily snapshots, not Amazon's historical data."
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-3.5 rounded-full bg-chart-1" />
                BSR (rank)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-3.5 rounded-full bg-chart-2" />
                Price
              </span>
            </div>
          </div>
          <CardDescription className="mt-1">
            History starts the day we began tracking this ASIN — it builds up over time
            from zero coverage, so early gaps are expected. Rank axis is inverted (up = better).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-4">
          <HistoryChart data={points} />
          <div className="mt-2 flex items-center justify-end">
            <ProvenanceHint provenance={history.provenance} />
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────── (d) Review intelligence ───────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Sentiment summary */}
        <Card className="gap-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="size-4 text-brand" />
              <CardTitle className="text-base">Review intelligence</CardTitle>
              <ConfidenceBadge
                confidence="low"
                note={sentiment.provenance.note ?? "Sentiment is modeled on a logged-out review sample."}
              />
            </div>
            <CardDescription className="mt-1">
              Based on{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatNumber(analysed)}
              </span>{" "}
              of{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatNumber(reported)}
              </span>{" "}
              reported reviews ({formatPct(coveragePct, "en", { decimals: 0 })} sampled).
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
                <SplitLegend tone="positive" label="Positive" pct={sentiment.positivePct} />
                <SplitLegend tone="neutral" label="Neutral" pct={sentiment.neutralPct} />
                <SplitLegend tone="negative" label="Negative" pct={sentiment.negativePct} />
              </div>
            </div>

            {/* Language mix */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Language mix</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(sentiment.langMix) as [ReviewLang, number][])
                  .filter(([, n]) => n > 0)
                  .map(([lang, n]) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {LANG_LABEL[lang]}
                      <span className="font-medium tabular-nums text-foreground">{n}</span>
                    </span>
                  ))}
              </div>
            </div>

            <Separator />

            {/* Pros / Cons with evidence quotes */}
            <div className="space-y-4">
              <AspectGroup
                title="What buyers like"
                icon={<ThumbsUp className="size-4 text-positive" />}
                aspects={sentiment.pros}
                tone="positive"
                emptyLabel="No positive aspects surfaced in the sample."
              />
              <AspectGroup
                title="Common complaints"
                icon={<ThumbsDown className="size-4 text-negative" />}
                aspects={sentiment.cons}
                tone="negative"
                emptyLabel="No recurring complaints in the sample."
              />
            </div>

            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <span aria-hidden>⚠</span>
              Reviews are a truncated logged-out sample; treat themes as directional, not
              exhaustive.
            </p>
          </CardContent>
        </Card>

        {/* Individual reviews */}
        <Card className="gap-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Reviews
                <span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">
                  {formatNumber(reviews.length)} shown
                </span>
              </CardTitle>
              <ConfidenceBadge confidence="medium" note="Individual review text as scraped." />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {reviews.length ? (
              <ul className="divide-y divide-border">
                {reviews.map((review) => (
                  <ReviewItem key={review.reviewId} review={review} />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No reviews captured for this product yet.
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
  label,
  pct,
}: {
  tone: "positive" | "neutral" | "negative";
  label: string;
  pct: number;
}) {
  const dot =
    tone === "positive" ? "bg-positive" : tone === "negative" ? "bg-negative" : "bg-muted-foreground/50";
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium tabular-nums text-foreground">
        {formatPct(pct, "en", { decimals: 0 })}
      </span>
    </div>
  );
}

function AspectGroup({
  title,
  icon,
  aspects,
  tone,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  aspects: { aspect: string; quote?: string }[];
  tone: "positive" | "negative";
  emptyLabel: string;
}) {
  const accent = tone === "positive" ? "border-l-positive/50" : "border-l-negative/50";
  // De-duplicate by aspect so we show one representative quote per theme.
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
        {title}
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
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const isAr = review.lang === "ar";
  const sentiment = review.sentiment ? SENTIMENT_META[review.sentiment] : null;
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
                Verified purchase
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
            {sentiment.label}
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
          {formatNumber(review.helpfulVotes)} found this helpful
        </p>
      )}
    </li>
  );
}
