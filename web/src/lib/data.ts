/**
 * Data-access layer — the single seam the whole UI reads through.
 *
 * Today it synthesizes deterministic data from src/lib/seed.ts. When the live
 * amazon.eg adapters (docs/research/02-architecture.md §3) are wired in, ONLY
 * this file changes — every screen keeps importing the same functions and the
 * same domain types. Estimates carry confidence/provenance end-to-end so the UI
 * can label them honestly.
 */

import type {
  BsrHistory,
  Confidence,
  DemandBand,
  Keyword,
  Period,
  Product,
  Provenance,
  RankingRow,
  Review,
  SentimentSummary,
  WinningScore,
  WpsOverrides,
} from "@/lib/types";
import {
  ASPECTS,
  KEYWORDS,
  PRODUCTS,
  PRODUCT_BY_ASIN,
  REVIEW_TEMPLATES,
  SEED_DAYS,
  SEED_NOW,
  hashString,
  rng,
  type SeedProduct,
} from "@/lib/seed";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import * as real from "@/lib/real-store";
import {
  computeWinningScore,
  WINNING_SCORE_CONFIG,
  EMPTY_CONTEXT,
  type ScoreContext,
} from "@/lib/winning-score";

/** Deterministic "freshness" — pretend the last scrape was 3h before SEED_NOW. */
const FETCHED_AT = new Date(SEED_NOW - 3 * 3600 * 1000).toISOString();

/** Whether the app is serving REAL scraped data (vs deterministic seed). Lets
 *  screens hide controls that have no effect in real mode (e.g. period tabs on
 *  best-sellers, which are a single daily list). */
export function isRealData(): boolean {
  return real.available();
}

/** Freshness of the keywords channel specifically — the trends worker can fail
 *  independently of the main scrape, so keywords never borrow the newer stamp. */
export function getKeywordsFreshness(): string | null {
  if (real.available()) return real.keywordsScrapedAt();
  return FETCHED_AT;
}

function prov(
  source: string,
  confidence: Confidence,
  isEstimated: boolean,
  note?: string,
): Provenance {
  return { source, fetchedAt: FETCHED_AT, confidence, isEstimated, note };
}

function isoDay(dayIndex: number): string {
  const ms = SEED_NOW - (SEED_DAYS - 1 - dayIndex) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Absolute BSR baseline — more reviews ⇒ better (lower) rank. */
function bsrBaseline(p: SeedProduct): number {
  const base = Math.round(7000 / (p.reviewCount / 600 + 1));
  return Math.max(1, base + (p.bsr - 1) * 40);
}

/* ----------------------------- memo caches ------------------------------- */
const bsrCache = new Map<string, BsrHistory>();

export function getBsrHistory(asin: string): BsrHistory {
  if (real.available()) return real.bsrHistory(asin);
  const cached = bsrCache.get(asin);
  if (cached) return cached;
  const p = PRODUCT_BY_ASIN[asin];
  const r = rng(hashString(asin + ":bsr"));
  const baseline = p ? bsrBaseline(p) : 2000;
  // Per-product slope: some trend up (improving = lower BSR), some down.
  const slope = (r() - 0.45) * (baseline * 0.012);
  const points = Array.from({ length: SEED_DAYS }, (_, i) => {
    const drift = -slope * i; // improving rank over time if slope>0
    const noise = (r() - 0.5) * baseline * 0.18;
    const value = Math.max(1, Math.round(baseline + drift + noise));
    return { date: isoDay(i), value };
  });
  const basePrice = p?.priceEgp ?? 500;
  const pricePoints = Array.from({ length: SEED_DAYS }, (_, i) => {
    const wobble = (r() - 0.5) * basePrice * 0.06;
    const occasionalDrop = r() < 0.06 ? -basePrice * 0.1 : 0;
    return { date: isoDay(i), value: Math.round(basePrice + wobble + occasionalDrop) };
  });
  const hist: BsrHistory = {
    asin,
    points,
    pricePoints,
    provenance: prov("amazon_html_product", "medium", true, "Synthesized from snapshot history."),
  };
  bsrCache.set(asin, hist);
  return hist;
}

/** Smoothed current BSR for a period (daily = latest, weekly/monthly = mean). */
function currentBsr(asin: string, period: Period): number {
  const pts = getBsrHistory(asin).points.map((p) => p.value ?? 0);
  const window = period === "daily" ? 1 : period === "weekly" ? 7 : 30;
  const slice = pts.slice(-window);
  return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
}

/** Rank velocity in log space over the period window (positive = rising). */
function riseScore(asin: string, period: Period): number {
  const pts = getBsrHistory(asin).points.map((p) => p.value ?? 0);
  const window = period === "daily" ? 2 : period === "weekly" ? 7 : 30;
  const now = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 1 - window)];
  if (!now || !prev) return 0;
  return Math.log(prev) - Math.log(now);
}

/**
 * Demand band from a product's rank WITHIN its own category. BSR is
 * category-relative, so we never apply global thresholds across categories —
 * that would manufacture a misleading cross-category leaderboard (audit C1).
 * Exported so the search/watch cards share ONE source of truth.
 */
export function demandBandForAsin(asin: string, period: Period = "daily"): DemandBand {
  const p = PRODUCT_BY_ASIN[asin];
  if (!p) return "unknown";
  const peers = PRODUCTS.filter((x) => x.categoryNode === p.categoryNode)
    .map((x) => ({ asin: x.asin, bsr: currentBsr(x.asin, period) }))
    .sort((a, b) => a.bsr - b.bsr);
  const idx = peers.findIndex((x) => x.asin === asin);
  if (idx < 0) return "unknown";
  const frac = peers.length <= 1 ? 0 : idx / (peers.length - 1);
  if (frac <= 0.2) return "very-high";
  if (frac <= 0.45) return "high";
  if (frac <= 0.75) return "moderate";
  return "low";
}

function demandBandFor(asin: string, period: Period): DemandBand {
  return demandBandForAsin(asin, period);
}

export function toProduct(p: SeedProduct, period: Period = "daily"): Product {
  return {
    asin: p.asin,
    titleEn: p.titleEn,
    titleAr: p.titleAr,
    brand: p.brand,
    categoryNode: p.categoryNode,
    categoryName: CATEGORY_BY_NODE[p.categoryNode]?.nameEn,
    priceEgp: p.priceEgp,
    rating: p.rating,
    reviewCount: p.reviewCount,
    bsr: currentBsr(p.asin, period),
    sellerName: "Marketplace seller",
    inStock: true,
    firstSeenAt: isoDay(0),
    lastSeenAt: FETCHED_AT,
    provenance: prov(
      "amazon_html_bestsellers",
      "high",
      false,
      "Price, rating & review count are scraped facts; BSR is modeled from snapshot history.",
    ),
  };
}

export function getProduct(asin: string, period: Period = "daily"): Product | undefined {
  if (real.available()) return real.product(asin);
  const p = PRODUCT_BY_ASIN[asin];
  return p ? toProduct(p, period) : undefined;
}

export interface RankingQuery {
  categoryNode?: string;
  period?: Period;
  limit?: number;
}

export function getBestSellers(q: RankingQuery = {}): RankingRow[] {
  if (real.available()) return real.bestSellers(q);
  const period = q.period ?? "daily";
  const pool = PRODUCTS.filter((p) => !q.categoryNode || p.categoryNode === q.categoryNode);
  const rows = pool
    .map((p) => ({ p, bsr: currentBsr(p.asin, period) }))
    .sort((a, b) => a.bsr - b.bsr)
    .map(({ p }, i) => buildRow(p, "bestsellers", i + 1, period));
  return q.limit ? rows.slice(0, q.limit) : rows;
}

export function getMovers(q: RankingQuery = {}): RankingRow[] {
  if (real.available()) return real.movers(q);
  const period = q.period ?? "daily";
  const pool = PRODUCTS.filter((p) => !q.categoryNode || p.categoryNode === q.categoryNode);
  const rows = pool
    .map((p) => ({ p, rise: riseScore(p.asin, period) }))
    // Require a gain that rounds to >= 1% so the list never shows a "+0%" riser.
    .filter((x) => Math.round((Math.exp(x.rise) - 1) * 100) >= 1)
    .sort((a, b) => b.rise - a.rise)
    .map(({ p }, i) => buildRow(p, "movers", i + 1, period));
  return q.limit ? rows.slice(0, q.limit) : rows;
}

function buildRow(
  p: SeedProduct,
  listType: "bestsellers" | "movers",
  rank: number,
  period: Period,
): RankingRow {
  const rise = riseScore(p.asin, period);
  return {
    listType,
    categoryNode: p.categoryNode,
    rank,
    riseScore: rise,
    gainPct: Math.round((Math.exp(rise) - 1) * 100),
    rankDelta7d: -Math.round(rise * 50),
    demandBand: demandBandFor(p.asin, period),
    product: toProduct(p, period),
  };
}

/* ───────────────────── Opportunity Finder (Winning Product Score) ──────────── */

export interface OpportunityRow {
  product: Product;
  score: WinningScore;
}

/** Niche peer distributions for the competition/demand criteria (real or empty). */
export function getOpportunityContext(categoryNode: string): ScoreContext {
  return real.available() ? real.scoreContextFor(categoryNode) : EMPTY_CONTEXT;
}

/** Candidate products for a niche — enriched ones carry size/weight/material. */
export function getOpportunityProducts(categoryNode: string): Product[] {
  if (real.available()) return real.opportunityProducts(categoryNode);
  return PRODUCTS.filter((p) => p.categoryNode === categoryNode).map((p) => toProduct(p));
}

/**
 * The Opportunity Finder seam — scores a niche's products against the 12-point
 * winning-product filter. Pure scoring; `overrides` come from the client store.
 * Gated / insufficient-data candidates sink to the bottom of the list.
 */
export function getOpportunities(
  q: { categoryNode?: string; limit?: number } = {},
  overrides: WpsOverrides = {},
): OpportunityRow[] {
  const categoryNode = q.categoryNode ?? "automotive";
  const ctx = getOpportunityContext(categoryNode);
  const rows = getOpportunityProducts(categoryNode).map((product) => ({
    product,
    score: computeWinningScore(product, overrides, WINNING_SCORE_CONFIG, ctx),
  }));
  rows.sort((a, b) => {
    if (a.score.gated !== b.score.gated) return a.score.gated ? 1 : -1;
    if (!a.score.gated && !b.score.gated) return (b.score.score ?? 0) - (a.score.score ?? 0);
    return b.score.completeness - a.score.completeness;
  });
  return q.limit ? rows.slice(0, q.limit) : rows;
}

export function getReviews(asin: string, opts: { limit?: number } = {}): Review[] {
  if (real.available()) return real.reviews(asin);
  const r = rng(hashString(asin + ":rev"));
  const count = Math.min(opts.limit ?? 8, REVIEW_TEMPLATES.length);
  // Shuffle templates deterministically, bias toward the product's rating.
  const picks = [...REVIEW_TEMPLATES].sort(() => r() - 0.5).slice(0, count);
  return picks.map((t, i) => {
    const dayAgo = Math.floor(r() * 80) + 1;
    return {
      reviewId: `${asin}-r${i}`,
      asin,
      rating: t.rating,
      title: t.title,
      body: t.body,
      lang: t.lang,
      authorName: t.lang === "ar" ? "مشترٍ موثّق" : "Verified buyer",
      reviewedAt: new Date(SEED_NOW - dayAgo * 86400000).toISOString().slice(0, 10),
      verifiedPurchase: r() > 0.2,
      helpfulVotes: Math.floor(r() * 40),
      sentiment: t.sentiment,
      sentimentScore: 0.7 + r() * 0.25,
    };
  });
}

export function getSentimentSummary(asin: string): SentimentSummary {
  if (real.available()) return real.sentimentSummary(asin);
  const p = PRODUCT_BY_ASIN[asin];
  const reviews = getReviews(asin, { limit: 8 });
  const pos = reviews.filter((x) => x.sentiment === "positive").length;
  const neg = reviews.filter((x) => x.sentiment === "negative").length;
  const neu = reviews.length - pos - neg;
  const n = reviews.length || 1;
  const langMix = reviews.reduce(
    (acc, x) => ((acc[x.lang] = (acc[x.lang] ?? 0) + 1), acc),
    { ar: 0, en: 0, mixed: 0, unknown: 0 } as Record<string, number>,
  );
  const aspect = (sentiment: "positive" | "negative") =>
    reviews
      .filter((x) => x.sentiment === sentiment)
      .map((x, i) => ({
        aspect: ASPECTS[i % ASPECTS.length],
        sentiment,
        quote: x.body,
      }));
  return {
    asin,
    analysedCount: reviews.length,
    totalReported: p?.reviewCount ?? reviews.length,
    positivePct: Math.round((pos / n) * 100),
    neutralPct: Math.round((neu / n) * 100),
    negativePct: Math.round((neg / n) * 100),
    langMix: langMix as SentimentSummary["langMix"],
    pros: aspect("positive"),
    cons: aspect("negative"),
    provenance: prov(
      "amazon_html_reviews",
      "low",
      true,
      "Sentiment on a truncated logged-out review sample; not validated on .eg text.",
    ),
  };
}

export function getKeywords(opts: { limit?: number; lang?: "en" | "ar" } = {}): Keyword[] {
  const realKw = real.keywords(opts);
  if (realKw) return realKw;
  if (real.available()) return []; // real data present but keywords pending — never leak seed
  const list = KEYWORDS.filter((k) => !opts.lang || k.lang === opts.lang).map((k) => {
    const r = rng(hashString(k.query));
    const score = Math.max(1, Math.min(100, Math.round(k.baseScore + (r() - 0.5) * 6)));
    const trend: Keyword["trend"] =
      k.trendBias > 0.25 ? "rising" : k.trendBias < -0.15 ? "falling" : "flat";
    return {
      query: k.query,
      lang: k.lang,
      demandScore: score,
      trend,
      appearances: 2 + Math.floor(r() * 6),
      provenance: prov(
        "amazon_autocomplete",
        "low",
        true,
        "Estimated demand (relative interest), not true search volume.",
      ),
    };
  });
  list.sort((a, b) => b.demandScore - a.demandScore);
  return opts.limit ? list.slice(0, opts.limit) : list;
}

export function searchProducts(query: string, period: Period = "daily"): Product[] {
  if (real.available()) return real.search(query);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PRODUCTS.filter(
    (p) =>
      p.titleEn.toLowerCase().includes(q) ||
      p.titleAr.includes(query) ||
      p.brand.toLowerCase().includes(q),
  ).map((p) => toProduct(p, period));
}

export interface DashboardSummary {
  productsTracked: number;
  categoriesTracked: number;
  risingCount: number;
  avgRating: number;
  lastUpdated: string;
  topRisers: RankingRow[];
  topBestSellers: RankingRow[];
  topKeywords: Keyword[];
}

export function getDashboardSummary(period: Period = "daily"): DashboardSummary {
  const allRows = getBestSellers({ period }); // real or seed — single source
  const risers = getMovers({ period });
  const ratings = allRows
    .map((r) => r.product.rating)
    .filter((x): x is number => x != null);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  return {
    productsTracked: allRows.length,
    categoriesTracked: new Set(allRows.map((r) => r.categoryNode)).size,
    risingCount: risers.length,
    avgRating: Math.round(avg * 10) / 10,
    lastUpdated: (real.available() ? real.scrapedAt() : null) ?? FETCHED_AT,
    topRisers: risers.slice(0, 5),
    topBestSellers: getBestSellers({ period, limit: 5 }),
    topKeywords: getKeywords({ limit: 6 }),
  };
}

/* User-owned data (watchlist, alerts) lives in REAL persistent client stores —
   see lib/watchlist-store.tsx and lib/alerts-store.tsx. The fabricated demo
   getWatchlist()/getAlerts() that used to live here were removed: a platform
   whose contract is "every number on screen is honest" must not invent user
   state. (A Supabase RLS table swap later replaces those stores, not this file.) */
