/**
 * Real-data store — reads the JSON the scraper writes into web/src/data/real/
 * (live amazon.eg) and projects it onto the app's domain types. This is what
 * makes the UI show REAL data with zero screen changes: data.ts delegates here
 * whenever real data is present, else falls back to the seed synthesis.
 *
 * Today it reads files (local-cron model); swapping to a Supabase read is a
 * change to this file only (see docs/research/04-real-pipeline-spec.md §5).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type {
  BsrHistory,
  DemandBand,
  Keyword,
  Offer,
  OfferBook,
  OfferCondition,
  Period,
  Product,
  Provenance,
  RankingRow,
  Review,
  SellerProfile,
  SellerSummary,
  SentimentSummary,
} from "@/lib/types";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import { BREAK_TOKENS, FIT_TOKENS, type ScoreContext } from "@/lib/winning-score";
import { VALIDATORS } from "@/lib/real-schema";
import { profileFromProducts, rankSimilar, summariesFromProducts } from "@/lib/seller-analysis";

const DIR = path.join(process.cwd(), "src/data/real");
// Projection input type for the scraped JSON. Loose on purpose at the TYPE
// level — the real contract is enforced at RUNTIME by real-schema.ts before
// any object reaches this code (invalid files are rejected, never projected).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime-validated boundary (see real-schema.ts)
type Any = Record<string, any>;

/** Read + schema-validate one data file. An ABSENT file is not an issue (seed
 *  fallback is by design); an unreadable or schema-invalid file IS — it is
 *  rejected (null) and the reason recorded so /api/health can report it. */
function readJson(name: string, issues: Record<string, string>): Any | null {
  const f = path.join(DIR, name);
  if (!existsSync(f)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(f, "utf8"));
  } catch {
    issues[name] = "unreadable or invalid JSON";
    return null;
  }
  const err = VALIDATORS[name]?.(parsed) ?? null;
  if (err) {
    issues[name] = err;
    return null;
  }
  return parsed as Any;
}

// Cache keyed on the data files' mtime so a fresh scrape is picked up live.
let cache:
  | { mtime: number; bs: Any | null; pr: Any | null; kw: Any | null; sn: Any | null; issues: Record<string, string> }
  | null = null;
function store() {
  let mtime = 0;
  for (const f of ["bestsellers.json", "products.json", "keywords.json", "snapshots.json"]) {
    try {
      mtime += statSync(path.join(DIR, f)).mtimeMs; // any file change busts the cache
    } catch {
      /* file absent → contributes 0 */
    }
  }
  if (!cache || cache.mtime !== mtime) {
    const issues: Record<string, string> = {};
    cache = {
      mtime,
      bs: readJson("bestsellers.json", issues),
      pr: readJson("products.json", issues),
      kw: readJson("keywords.json", issues),
      sn: readJson("snapshots.json", issues),
      issues,
    };
  }
  return cache;
}

/** Schema-rejection reasons for the current data generation (file → reason).
 *  Empty when everything present parsed and validated. Surfaced by /api/health. */
export function dataIssues(): Record<string, string> {
  return { ...store().issues };
}

export function available(): boolean {
  return !!store().bs?.all?.length;
}
export function scrapedAt(): string | null {
  return store().bs?.scraped_at ?? null;
}
/** Keywords have their OWN freshness — the trends worker can fail independently
 *  of the main scrape, and stale keywords must never borrow the newer stamp. */
export function keywordsScrapedAt(): string | null {
  return store().kw?.scraped_at ?? null;
}

function prov(source: string, confidence: "high" | "medium" | "low", isEstimated: boolean, note?: string): Provenance {
  return { source, fetchedAt: scrapedAt() ?? "1970-01-01T00:00:00Z", confidence, isEstimated, note };
}

/** Within-category position → demand band (BSR is category-relative — audit C1). */
function bandFromPos(idx: number, n: number): DemandBand {
  const frac = n <= 1 ? 0 : idx / (n - 1);
  if (frac <= 0.2) return "very-high";
  if (frac <= 0.45) return "high";
  if (frac <= 0.75) return "moderate";
  return "low";
}

function posMap(): Map<string, { idx: number; n: number }> {
  const cats = store().bs?.categories ?? {};
  const m = new Map<string, { idx: number; n: number }>();
  for (const node of Object.keys(cats)) {
    const rows: Any[] = cats[node] ?? [];
    rows.forEach((r, i) => m.set(r.asin, { idx: i, n: rows.length }));
  }
  return m;
}

function leafBsr(asin: string): { rank: number; category: string } | null {
  const b = store().pr?.products?.[asin]?.bsr;
  return b?.length ? b[b.length - 1] : null;
}

/**
 * Egypt-only guardrail (last line of defence behind the scraper's own filter).
 * amazon.eg dp pages also carry a "Top reviews from other countries" block; a
 * foreign review's date line reads "Reviewed in <Country> on …" (the Arabic UI
 * uses "مصر" for Egypt). This is an Egypt-only platform, so any review whose
 * origin is parseable and NOT Egypt is excluded before it can ever render or
 * feed sentiment/complaint math. A review with no parseable origin is kept
 * (it can only have come from the local block).
 */
function isEgyptReview(r: Any): boolean {
  const date: string = r?.date ?? r?.reviewedAt ?? "";
  const m = /Reviewed in (.+?) on/i.exec(date);
  if (!m) return true; // no country marker → local block → keep
  const country = m[1].toLowerCase();
  return country.includes("egypt") || country.includes("مصر");
}

/** Raw scraped reviews for an ASIN, foreign reviews already stripped. */
function egyptReviewsRaw(asin: string): Any[] {
  const list: Any[] = store().pr?.products?.[asin]?.reviews_list ?? [];
  return list.filter(isEgyptReview);
}

/** Count reviews in the scraped sample whose text matches any token (EN + AR).
 *  Returns undefined when there is no sample (so the engine falls back to a
 *  material-only baseline rather than treating absence as zero complaints). */
function countComplaints(reviews: Any[] | undefined, tokens: string[]): number | undefined {
  if (!reviews?.length) return undefined;
  let n = 0;
  for (const r of reviews) {
    const text = `${r.title ?? ""} ${r.body ?? ""}`.toLowerCase();
    if (tokens.some((t) => text.includes(t.toLowerCase()))) n++;
  }
  return n;
}

function rowToProduct(row: Any): Product {
  const enr = store().pr?.products?.[row.asin];
  const leaf = leafBsr(row.asin);
  const egReviews = egyptReviewsRaw(row.asin); // Egypt-only; foreign reviews excluded
  return {
    asin: row.asin,
    titleEn: row.title ?? row.asin,
    titleAr: row.title_ar ?? undefined,
    brand: enr?.brand ?? undefined,
    categoryNode: row.category,
    categoryName:
      CATEGORY_BY_NODE[row.category]?.nameEn ?? (row.category === "unknown" ? undefined : row.category),
    imageUrl: row.image_url ?? undefined,
    priceEgp: row.price_egp ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.reviews ?? undefined,
    bsr: leaf?.rank ?? row.rank ?? undefined,
    sellerName: undefined,
    inStock: row.price_egp != null,
    lastSeenAt: scrapedAt() ?? undefined,
    // Detail-page attributes — present only on ENRICHED products (else undefined,
    // which the Winning Score treats as "criterion unavailable", never zero).
    material: enr?.material ?? undefined,
    manufacturer: enr?.manufacturer ?? undefined,
    color: enr?.color ?? undefined,
    numberOfItems: enr?.number_of_items ?? undefined,
    itemWeightKg: enr?.item_weight_kg ?? undefined,
    itemDimensionsCm: enr?.item_dims_cm ?? undefined,
    imageCount: enr?.image_count ?? undefined,
    featureBulletCount: enr?.feature_bullet_count ?? undefined,
    offerCount: enr?.offer_count ?? undefined,
    bsrLeafCategory: leaf?.category ?? undefined,
    reviewSampleSize: egReviews.length || undefined,
    breakComplaintCount: countComplaints(egReviews, BREAK_TOKENS),
    fitComplaintCount: countComplaints(egReviews, FIT_TOKENS),
    provenance: prov(
      "amazon_html_bestsellers",
      "high",
      false,
      "Live amazon.eg best-seller listing — price, rating & reviews are scraped facts.",
    ),
  };
}

function rowToRanking(row: Any, pos: Map<string, { idx: number; n: number }>): RankingRow {
  const p = pos.get(row.asin);
  return {
    listType: "bestsellers",
    categoryNode: row.category,
    rank: row.rank ?? (p ? p.idx + 1 : 1),
    demandBand: p ? bandFromPos(p.idx, p.n) : "unknown",
    product: rowToProduct(row),
  };
}

export function bestSellers(q: { categoryNode?: string; period?: Period; limit?: number } = {}): RankingRow[] {
  const s = store();
  const pos = posMap();
  const rows: Any[] = q.categoryNode ? s.bs?.categories?.[q.categoryNode] ?? [] : s.bs?.all ?? [];
  const out = rows.map((r) => rowToRanking(r, pos));
  return q.limit ? out.slice(0, q.limit) : out;
}

/** Products in a category (or all), projected to domain type — the Opportunity
 *  Finder scores these. Enriched products carry the size/weight/material facts. */
export function opportunityProducts(categoryNode?: string): Product[] {
  const rows: Any[] = categoryNode ? store().bs?.categories?.[categoryNode] ?? [] : store().bs?.all ?? [];
  return rows.map(rowToProduct);
}

/** Niche-relative peer distributions for the competition + demand criteria.
 *  Built once per category so the per-product scorers stay pure. */
export function scoreContextFor(categoryNode: string): ScoreContext {
  const rows: Any[] = store().bs?.categories?.[categoryNode] ?? [];
  const products = store().pr?.products ?? {};
  const peerReviewCounts: number[] = [];
  const peerBrandCounts: Record<string, number> = {};
  const peerImageCounts: number[] = [];
  for (const r of rows) {
    if (typeof r.reviews === "number") peerReviewCounts.push(r.reviews);
    const enr = products[r.asin];
    const brand: string | undefined = enr?.brand ?? r.brand;
    if (brand) peerBrandCounts[brand] = (peerBrandCounts[brand] ?? 0) + 1;
    if (enr && typeof enr.image_count === "number") peerImageCounts.push(enr.image_count);
  }
  return { peerReviewCounts, peerBrandCounts, peerCount: rows.length, peerImageCounts };
}

/**
 * Rising = a product whose best-seller rank IMPROVED (number went down) over the
 * period, computed from the append-only snapshot series the scraper writes daily.
 * Honestly empty until >= 2 daily snapshots exist for an item (day-1 has no
 * velocity). riseScore = ln(rankThen) - ln(rankNow) so a move from #9 → #3 ranks
 * above #40 → #38, and gainPct is the rank-improvement ratio.
 */
export function movers(q: { categoryNode?: string; period?: Period; limit?: number } = {}): RankingRow[] {
  const snaps: Any = store().sn?.snapshots ?? {};
  const all: Any[] = store().bs?.all ?? [];
  const byAsin = new Map<string, Any>(all.map((r) => [r.asin, r]));
  const pos = posMap();
  const windowDays = q.period === "weekly" ? 7 : q.period === "monthly" ? 30 : 1;

  const risers: { asin: string; rise: number; row: Any }[] = [];
  for (const asin of Object.keys(snaps)) {
    const series: Any[] = snaps[asin] ?? [];
    if (series.length < 2) continue; // need a baseline to measure velocity
    const now = series[series.length - 1];
    const then = series[Math.max(0, series.length - 1 - windowDays)];
    if (now === then || now?.rank == null || then?.rank == null) continue;
    const rise = Math.log(then.rank) - Math.log(now.rank); // rank decreased ⇒ positive
    if (rise <= 0) continue;
    const row = byAsin.get(asin);
    if (!row) continue; // only surface products still on a live best-seller list
    if (q.categoryNode && row.category !== q.categoryNode) continue;
    risers.push({ asin, rise, row });
  }
  // No fallback when velocity history is missing: a synthesized "riser" with a
  // manufactured gainPct would violate the honest-data contract. Movers stays
  // empty until >= 2 daily snapshots exist (the UI explains why), which is the
  // steady state after the first two cron runs.

  risers.sort((a, b) => b.rise - a.rise);

  const out: RankingRow[] = risers.map((x, i) => {
    const p = pos.get(x.asin);
    return {
      listType: "movers",
      categoryNode: x.row.category,
      rank: i + 1,
      riseScore: Number(x.rise.toFixed(4)),
      gainPct: Math.round((Math.exp(x.rise) - 1) * 100),
      demandBand: p ? bandFromPos(p.idx, p.n) : "unknown",
      product: rowToProduct(x.row),
    };
  });
  return q.limit ? out.slice(0, q.limit) : out;
}

export function product(asin: string): Product | undefined {
  const row = (store().bs?.all ?? []).find((r: Any) => r.asin === asin);
  if (row) return rowToProduct(row);
  const enr = store().pr?.products?.[asin];
  if (enr) {
    // Enriched-only product (dropped off the live lists): its app category is
    // genuinely unknown — never attribute a made-up one (the UI hides
    // category-dependent bits like the referral-fee preview for "unknown").
    return rowToProduct({
      asin,
      title: enr.title,
      price_egp: enr.price_egp,
      rating: enr.rating,
      reviews: enr.reviews,
      category: "unknown",
      image_url: undefined,
    });
  }
  return undefined;
}

export function search(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return (store().bs?.all ?? [])
    .filter((r: Any) => (r.title ?? "").toLowerCase().includes(q))
    .map(rowToProduct);
}

export function bsrHistory(asin: string): BsrHistory {
  // Prefer the append-only daily series (real history that grows each run).
  const series: Any[] = store().sn?.snapshots?.[asin] ?? [];
  if (series.length) {
    return {
      asin,
      points: series.filter((s) => s.rank != null).map((s) => ({ date: s.date, value: s.rank })),
      pricePoints: series.filter((s) => s.price != null).map((s) => ({ date: s.date, value: s.price })),
      provenance: prov(
        "amazon_html_bestsellers",
        "medium",
        false,
        series.length >= 2
          ? "Best-seller rank & price tracked across daily snapshots."
          : "Tracking just started — one snapshot so far; history grows daily.",
      ),
    };
  }
  // Fallback: single current point before any snapshot series exists.
  const leaf = leafBsr(asin);
  const date = (scrapedAt() ?? "").slice(0, 10);
  const row = (store().bs?.all ?? []).find((r: Any) => r.asin === asin);
  return {
    asin,
    points: leaf ? [{ date, value: leaf.rank }] : [],
    pricePoints: row?.price_egp != null ? [{ date, value: row.price_egp }] : [],
    provenance: prov("amazon_html_product", "medium", false, "Real snapshot — history builds with each daily run."),
  };
}

export function reviews(asin: string): Review[] {
  const list: Any[] = egyptReviewsRaw(asin); // Egypt-only platform: no foreign reviews
  return list.map((r, i) => ({
    reviewId: r.review_id ?? `${asin}-r${i}`,
    asin,
    rating: r.rating ?? undefined,
    title: r.title ?? undefined,
    body: r.body ?? "",
    lang: (r.lang as Review["lang"]) ?? "en",
    authorName: undefined, // PII guardrail: reviewer display names dropped at ingest
    reviewedAt: r.date ?? undefined,
    verifiedPurchase: r.verified ?? undefined,
    helpfulVotes: r.helpful ?? undefined,
    // Honest heuristic: a review's own star rating IS a real sentiment signal.
    sentiment:
      r.rating != null ? (r.rating >= 4 ? "positive" : r.rating <= 2 ? "negative" : "neutral") : undefined,
    sentimentScore: r.rating != null ? r.rating / 5 : undefined,
  }));
}

export function sentimentSummary(asin: string): SentimentSummary {
  const rl = reviews(asin);
  const p = product(asin);
  const n = rl.length;
  const pos = rl.filter((r) => r.sentiment === "positive").length;
  const neg = rl.filter((r) => r.sentiment === "negative").length;
  return {
    asin,
    analysedCount: n,
    totalReported: p?.reviewCount ?? n,
    positivePct: n ? Math.round((pos / n) * 100) : 0,
    neutralPct: n ? Math.round(((n - pos - neg) / n) * 100) : 0,
    negativePct: n ? Math.round((neg / n) * 100) : 0,
    langMix: { ar: rl.filter((r) => r.lang === "ar").length, en: rl.filter((r) => r.lang === "en").length, mixed: 0, unknown: 0 },
    pros: rl
      .filter((r) => r.sentiment === "positive")
      .slice(0, 3)
      .map((r) => ({ aspect: "What buyers liked", sentiment: "positive" as const, quote: (r.body || r.title || "").slice(0, 160) })),
    cons: rl
      .filter((r) => r.sentiment === "negative")
      .slice(0, 3)
      .map((r) => ({ aspect: "Complaint", sentiment: "negative" as const, quote: (r.body || r.title || "").slice(0, 160) })),
    provenance: prov(
      "amazon_html_reviews",
      "low",
      true,
      n
        ? "Sentiment derived from review star ratings (heuristic); excerpts are top/bottom-rated reviews."
        : "Review collection pending — none scraped yet for this item.",
    ),
  };
}

/**
 * Real keywords from Amazon EG autocomplete (written by the trends worker).
 * `demandScore` is an ORDINAL autocomplete-prominence rank (how high the term
 * sits in Amazon's suggestion list), NOT search volume or demand quantity.
 * Null until present.
 */
export function keywords(opts: { limit?: number; lang?: "en" | "ar" } = {}): Keyword[] | null {
  const kw: Any[] = store().kw?.keywords ?? [];
  if (!kw.length) return null;
  const list: Keyword[] = kw
    .filter((k) => !opts.lang || k.lang === opts.lang)
    .map((k) => ({
      query: k.query,
      lang: k.lang ?? "en",
      demandScore: k.demandScore ?? k.score ?? 0,
      trend: k.trend ?? "flat",
      appearances: k.appearances ?? 0,
      provenance: prov(
        "amazon_eg_autocomplete",
        "low",
        true,
        "Amazon autocomplete prominence (ordinal) — how prominently amazon.eg suggests the term, not search volume.",
      ),
    }))
    .sort((a, b) => b.demandScore - a.demandScore);
  return opts.limit ? list.slice(0, opts.limit) : list;
}

/* ───────────────────────── Sellers & offers ───────────────────────── */

const AMAZON_EG = "https://www.amazon.eg";

/** amazon.eg product deep link (opens in the shopper's residential browser). */
export function amazonProductUrl(asin: string): string {
  return `${AMAZON_EG}/dp/${asin}`;
}

const CONDITIONS: OfferCondition[] = ["New", "Used", "Refurbished"];

/** Real per-seller offers for a product (offer-listing/AOD scrape), price-sorted.
 *  Every offer is the same Egypt listing from a different merchant. */
export function offers(asin: string): OfferBook {
  const raw: Any[] = store().pr?.products?.[asin]?.offers ?? [];
  const enr = store().pr?.products?.[asin];
  const list: Offer[] = raw
    .map((o) => ({
      sellerName: o.seller_name ?? undefined,
      sellerId: o.seller_id ?? undefined,
      priceEgp: o.price_egp ?? undefined,
      fba: Boolean(o.fba),
      condition: (CONDITIONS.includes(o.condition) ? o.condition : "New") as OfferCondition,
      isBuyBox: Boolean(o.is_buybox),
    }))
    // Cheapest first; offers without a price sink to the bottom.
    .sort((a, b) => (a.priceEgp ?? Infinity) - (b.priceEgp ?? Infinity));
  return {
    asin,
    offers: list,
    reportedOfferCount: enr?.offer_count ?? undefined,
    amazonOffersUrl: `${AMAZON_EG}/gp/offer-listing/${asin}`,
    provenance: prov(
      "amazon_html_offer_listing",
      "high",
      false,
      list.length
        ? "Live amazon.eg offer-listing — seller, price & fulfilment are scraped facts."
        : "Per-seller offers not yet scraped for this item; see the listing on Amazon.",
    ),
  };
}

/** All tracked products as domain objects (best-seller rows carry the brand). */
export function allProducts(): Product[] {
  return (store().bs?.all ?? []).map(rowToProduct);
}

const SELLER_PROV_NOTE =
  "Seller = the brand/store byline on the amazon.eg best-seller listings we track (a sample, not their full catalogue).";

/** Similar products in Egypt: same category (price-proximity ranked) then same brand. */
export function similarProducts(asin: string, limit = 6): Product[] {
  const self = product(asin);
  if (!self) return [];
  return rankSimilar(self, allProducts().filter((p) => p.asin !== asin), limit);
}

/** Brand/store sellers aggregated across tracked products, strongest first. */
export function sellers(): SellerSummary[] {
  return summariesFromProducts(
    allProducts(),
    prov("amazon_html_bestsellers", "high", false, SELLER_PROV_NOTE),
  );
}

/** Full seller (brand) profile + data-derived competitive analysis. */
export function seller(slug: string): SellerProfile | undefined {
  return profileFromProducts(
    slug,
    allProducts(),
    prov("amazon_html_bestsellers", "high", false, SELLER_PROV_NOTE),
  );
}
