/**
 * Domain model for the Amazon Egypt (amazon.eg) product-research platform.
 *
 * This is the UI-facing projection of the normalized `DataAdapter` schema
 * (see docs/research/02-architecture.md). Every value that is modeled rather
 * than scraped carries an explicit `confidence` + `isEstimated` flag so the UI
 * can NEVER present an estimate as ground truth — that disclosure discipline is
 * a Critical correctness control per the feasibility audit, not optional polish.
 */

export type Locale = "en" | "ar";

/** Reliability of a single value. Drives the confidence-tier UI everywhere. */
export type Confidence = "high" | "medium" | "low";

/** How much we trust a derived signal's framing. */
export type SignalKind =
  | "fact" // scraped directly (price, review count) — high trust
  | "ordinal" // within-category rank / relative position — medium trust
  | "estimate"; // modeled (BSR→band, demand score) — low trust, always labelled

export interface Provenance {
  source: string; // SourceType from the adapter layer
  fetchedAt: string; // ISO-8601 UTC
  isEstimated: boolean;
  confidence: Confidence;
  /** Optional human note shown in disclosure tooltips. */
  note?: string;
}

export type ListType = "bestsellers" | "movers";

export interface Category {
  nodeId: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  parentNode?: string;
}

/** A single point in a time-series (BSR or price). */
export interface SeriesPoint {
  /** ISO date (YYYY-MM-DD) for daily snapshots. */
  date: string;
  value: number | null;
}

export interface Product {
  asin: string;
  titleEn: string;
  titleAr?: string;
  brand?: string;
  categoryNode: string;
  categoryName?: string;
  imageUrl?: string;
  /** Consumer price in EGP — VAT-inclusive (what the shopper pays). */
  priceEgp?: number;
  rating?: number; // 0–5
  reviewCount?: number;
  /** Best Seller Rank within its primary category (lower = better). */
  bsr?: number;
  sellerName?: string;
  inStock?: boolean;
  firstSeenAt?: string;
  lastSeenAt?: string;
  provenance: Provenance;
}

/**
 * Relative demand band derived from log(BSR) percentile WITHIN a category.
 * Never a unit count, never comparable across categories.
 */
export type DemandBand = "very-high" | "high" | "moderate" | "low" | "unknown";

export interface RankingRow {
  listType: ListType;
  categoryNode: string;
  /** 1-based position on the list. */
  rank: number;
  /** Movement vs the previous snapshot window (negative rank delta = rising). */
  rankDelta7d?: number;
  /** Movers & Shakers gain, e.g. +320 (%). */
  gainPct?: number;
  /** Rank velocity in log space: ln(bsrPrev) - ln(bsrNow). Positive = improving. */
  riseScore?: number;
  demandBand: DemandBand;
  product: Product;
}

export interface BsrHistory {
  asin: string;
  points: SeriesPoint[]; // daily BSR snapshots (our own time-series)
  pricePoints: SeriesPoint[]; // daily price snapshots
  provenance: Provenance;
}

export type ReviewLang = "ar" | "en" | "mixed" | "unknown";
export type SentimentLabel = "positive" | "neutral" | "negative";

export interface ReviewAspect {
  /** Fixed Egypt aspect buckets: quality, value, shipping, authenticity, etc. */
  aspect: string;
  sentiment: SentimentLabel;
  /** Representative quote from a real review (evidence). */
  quote?: string;
}

export interface Review {
  reviewId: string;
  asin: string;
  rating?: number;
  title?: string;
  body: string;
  lang: ReviewLang;
  authorName?: string;
  reviewedAt?: string;
  verifiedPurchase?: boolean;
  helpfulVotes?: number;
  sentiment?: SentimentLabel;
  sentimentScore?: number;
}

export interface SentimentSummary {
  asin: string;
  /** Reviews actually analysed vs total reported on the listing (N of M). */
  analysedCount: number;
  totalReported: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  langMix: Record<ReviewLang, number>;
  pros: ReviewAspect[];
  cons: ReviewAspect[];
  provenance: Provenance;
}

export type DemandTrend = "rising" | "flat" | "falling";

/**
 * Keyword demand proxy. NOT search volume — an ordinal popularity signal.
 * `demandScore` is 0–100 relative interest only; isEstimated is ALWAYS true.
 */
export interface Keyword {
  query: string;
  lang: Locale;
  demandScore: number; // 0–100, relative
  trend: DemandTrend;
  appearances: number; // # of seed prefixes that surfaced it
  topAsins?: string[];
  provenance: Provenance;
}

/* ────────────────────────── Fees & profit calculator ───────────────────── */

/** One piecewise referral-fee band: `rate` applies up to `uptoEgp` (null = ∞). */
export interface ReferralTier {
  uptoEgp: number | null;
  rate: number; // 0–1
}

export interface ReferralRule {
  category: string;
  categoryNode?: string;
  tiers: ReferralTier[];
  minFeeEgp: number | null;
}

export interface FbaRung {
  sizeTier: string;
  label: string;
  maxWeightKg: number;
  lowPriceFeeEgp: number; // for items <= fbaPriceBandEgp
  highPriceFeeEgp: number; // for items > fbaPriceBandEgp
}

export interface FeeSchedule {
  asOf: string; // YYYY-MM-DD — fees are versioned, never hard-coded constants
  vatRate: number; // 0.14 for Egypt
  fbaPriceBandEgp: number; // ~350
  storageEgpPerCuFtMonth: number;
  referral: ReferralRule[];
  fbaLadder: FbaRung[];
  /** Source + verification status — fees must be spot-confirmed before trusting. */
  provenance: Provenance;
}

export type FulfillmentMethod = "fba" | "fbm";

export interface CalculatorInput {
  sellPriceEgp: number; // VAT-inclusive consumer price
  costOfGoodsEgp: number; // what you pay the local shop
  categoryNode: string;
  fulfillment: FulfillmentMethod;
  fbaSizeTier?: string;
  inboundShippingEgp?: number; // your cost to get units to Amazon/customer
  miscCostEgp?: number;
  /** VAT-registered sellers remit output VAT (revenue = price/1.14) and can
   *  reclaim VAT charged on Amazon's fees. */
  vatRegistered: boolean;
}

export interface CalculatorResult {
  sellPriceEgp: number;
  netRevenueEgp: number; // after output-VAT strip if registered
  referralFeeEgp: number;
  referralVatEgp: number;
  fbaFeeEgp: number;
  fbaVatEgp: number;
  reclaimableVatEgp: number; // fee VAT reclaimed if registered
  costOfGoodsEgp: number;
  inboundShippingEgp: number;
  miscCostEgp: number;
  totalFeesEgp: number;
  totalCostEgp: number;
  netProfitEgp: number;
  marginPct: number; // netProfit / sellPrice
  roiPct: number; // netProfit / (cogs + shipping + misc)
  breakEvenPriceEgp: number; // sell price where netProfit = 0
  warnings: string[];
}

/* ───────────────────────────── User-owned ──────────────────────────────── */

export interface WatchlistItem {
  asin: string;
  addedAt: string;
  product: Product;
}

export type AlertRule =
  | "price_drop"
  | "bsr_rising"
  | "back_in_stock"
  | "rating_drop";

export interface Alert {
  id: string;
  asin: string;
  productTitle: string;
  rule: AlertRule;
  threshold: Record<string, number | string>;
  active: boolean;
  lastFiredAt?: string;
  createdAt: string;
}

/** Period selector shared across dashboard / rankings. */
export type Period = "daily" | "weekly" | "monthly";
