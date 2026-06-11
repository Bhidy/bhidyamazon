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

  /* ── Detail-page attributes (scraped only when a product is enriched; ALL
        optional — absence means "criterion unavailable", never zero). These
        power the Winning Product Score. */
  /** Normalized to kilograms at ingest (scrapers/parse.py `_weight_to_kg`). */
  itemWeightKg?: number;
  /** Normalized to centimeters at ingest; `h` is 0 when only two dims are listed. */
  itemDimensionsCm?: { l: number; w: number; h: number };
  /** Raw "Material Type", e.g. "Plastic", "Silicone", "Mixed Materials". */
  material?: string;
  manufacturer?: string;
  color?: string;
  /** "Number of Items" / "Unit Count" — a bundle hint. */
  numberOfItems?: number;
  /** Listing-quality proxies (competition strength, use-case clarity). */
  imageCount?: number;
  featureBulletCount?: number;
  offerCount?: number;
  /** Amazon's leaf BSR category label, e.g. "Garbage Cans" (≠ app categoryNode). */
  bsrLeafCategory?: string;
  /** Review-mined signals, precomputed in real-store from the scraped sample. */
  reviewSampleSize?: number;
  breakComplaintCount?: number;
  fitComplaintCount?: number;

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
/* Watchlist + alert STORAGE shapes live with their persistent client stores
   (lib/watchlist-store.tsx, lib/alerts-store.tsx); only the rule vocabulary is
   part of the shared domain model. */

export type AlertRule =
  | "price_drop"
  | "bsr_rising"
  | "back_in_stock"
  | "rating_drop";

/** Period selector shared across dashboard / rankings. */
export type Period = "daily" | "weekly" | "monthly";

/* ───────────────────── Winning Product Score (Opportunity Finder) ────────────
 * Scores a product against the 12-point sourcing filter
 * (small + cheap + non-breakable + low return + clear need + weak competition +
 *  enough demand). Every criterion carries its own confidence + signal kind so a
 * modeled guess is NEVER presented as a fact — the same disclosure discipline the
 * rest of the platform enforces, extended to all 12 criteria.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Stable keys for the 12 criteria — used in config, scores, and overrides. */
export type CriterionKey =
  | "category" // 1  car-accessory category membership
  | "size" // 2  very small
  | "weight" // 3  very light
  | "material" // 4  plastic/silicone/fabric & non-electronic
  | "breakRisk" // 5  low break risk
  | "returnRisk" // 6  low return risk, not model-fit-dependent
  | "price" // 7  low–medium price
  | "useCaseClarity" // 8  clear in 3s
  | "competition" // 9  weak competition (listings/photos/branding)
  | "demand" // 10 enough demand, not overcrowded
  | "sourcing" // 11 easy local/China sourcing
  | "bundle"; // 12 bundle potential

/** Coarse human-facing band for a single criterion subscore. */
export type CriterionBand = "strong" | "moderate" | "weak" | "unknown";

/** Confidence tier for a WPS value. Extends the global Confidence with the
 *  user-confirmation tier so an override visibly outranks any auto value. */
export type WpsConfidence = "user-confirmed" | "high" | "medium" | "low";

/** Result of scoring ONE criterion for ONE product. */
export interface CriterionScore {
  key: CriterionKey;
  /** 0–100 subscore, or null when the criterion could not be evaluated. */
  subscore: number | null;
  band: CriterionBand;
  confidence: WpsConfidence;
  /** Honest framing: fact vs ordinal vs estimate. */
  signal: SignalKind;
  /** Whether a value was available at all (false ⇒ excluded from the composite). */
  available: boolean;
  /** Whether this score came from a user override / confirmation. */
  overridden: boolean;
  /** Deterministic, human-readable explanation (e.g. "0.08 kg ≤ 0.15 kg → very light"). */
  reason: string;
  /** Weight this criterion contributed in the composite (renormalized over available). */
  effectiveWeight: number;
}

export type WpsVerdict =
  | "winner"
  | "promising"
  | "marginal"
  | "avoid"
  | "insufficient-data";

export interface WinningScore {
  asin: string;
  /** 0–100 weighted composite over AVAILABLE criteria, or null when nothing scored. */
  score: number | null;
  verdict: WpsVerdict;
  /** 0–1: weight-share of criteria that were actually evaluable. */
  completeness: number;
  /** 0–1: weight-share of evaluated criteria whose confidence is high/user-confirmed. */
  confidenceCoverage: number;
  criteria: CriterionScore[];
  /** True when completeness < gate OR a required criterion is missing ⇒ UI hides the number. */
  gated: boolean;
  presetId: string;
  configVersion: string;
  provenance: Provenance;
}

/** A single user override / confirmation for one criterion of one product. */
export interface CriterionOverride {
  /** Pin a 0–100 subscore. Absent + `confirm` ⇒ accept the auto value as-is. */
  subscore?: number;
  /** true ⇒ accept the auto band but raise confidence to user-confirmed. */
  confirm?: boolean;
  note?: string;
  updatedAt: string; // ISO-8601
}

/** asin → criterionKey → override. The pure engine takes this as a parameter. */
export type WpsOverrides = Record<
  string,
  Partial<Record<CriterionKey, CriterionOverride>>
>;

export interface CriterionConfig {
  key: CriterionKey;
  weight: number; // relative; engine renormalizes over available
  labelEn: string;
  labelAr: string;
  /** Default signal framing when auto-scored (overrides bump to user-confirmed). */
  signal: SignalKind;
  /** Criterion-specific numeric thresholds (see winning-score.ts). */
  thresholds?: Record<string, number>;
}

export interface WinningScoreConfig {
  version: string; // e.g. "wps-2026-06-09"
  asOf: string; // YYYY-MM-DD (mirrors FeeSchedule.asOf)
  presetId: string; // "car-micro-utility"
  presetLabelEn: string;
  presetLabelAr: string;
  criteria: CriterionConfig[];
  /** Composite cutoffs (0–100) → verdict. */
  verdictBands: { winner: number; promising: number; marginal: number };
  /** Below this completeness the result is gated to "insufficient-data". */
  minCompleteness: number; // e.g. 0.6
  /** Criteria that must be available regardless of the completeness math. */
  requiredCriteria: CriterionKey[];
  provenance: Provenance; // mirrors DEFAULT_FEE_SCHEDULE.provenance
}
