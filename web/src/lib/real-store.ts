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
  Period,
  Product,
  Provenance,
  RankingRow,
  Review,
  SentimentSummary,
} from "@/lib/types";
import { CATEGORY_BY_NODE } from "@/lib/constants";

const DIR = path.join(process.cwd(), "src/data/real");
type Any = Record<string, any>;

function readJson(name: string): Any | null {
  try {
    const f = path.join(DIR, name);
    if (!existsSync(f)) return null;
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return null;
  }
}

// Cache keyed on the bestsellers file mtime so a fresh scrape is picked up live.
let cache: { mtime: number; bs: Any | null; pr: Any | null; kw: Any | null } | null = null;
function store() {
  let mtime = 0;
  for (const f of ["bestsellers.json", "products.json", "keywords.json"]) {
    try {
      mtime += statSync(path.join(DIR, f)).mtimeMs; // any file change busts the cache
    } catch {
      /* file absent → contributes 0 */
    }
  }
  if (!cache || cache.mtime !== mtime) {
    cache = { mtime, bs: readJson("bestsellers.json"), pr: readJson("products.json"), kw: readJson("keywords.json") };
  }
  return cache;
}

export function available(): boolean {
  return !!store().bs?.all?.length;
}
export function scrapedAt(): string | null {
  return store().bs?.scraped_at ?? null;
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

function rowToProduct(row: Any): Product {
  const enr = store().pr?.products?.[row.asin];
  const leaf = leafBsr(row.asin);
  return {
    asin: row.asin,
    titleEn: row.title ?? row.asin,
    titleAr: row.title_ar ?? undefined,
    brand: enr?.brand ?? undefined,
    categoryNode: row.category,
    categoryName: CATEGORY_BY_NODE[row.category]?.nameEn ?? row.category,
    imageUrl: row.image_url ?? undefined,
    priceEgp: row.price_egp ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.reviews ?? undefined,
    bsr: leaf?.rank ?? row.rank ?? undefined,
    sellerName: undefined,
    inStock: row.price_egp != null,
    lastSeenAt: scrapedAt() ?? undefined,
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

/** Rising needs >= 2 daily snapshots; on day 1 there is no real velocity yet. */
export function movers(_q: { categoryNode?: string; period?: Period; limit?: number } = {}): RankingRow[] {
  return [];
}

export function product(asin: string): Product | undefined {
  const row = (store().bs?.all ?? []).find((r: Any) => r.asin === asin);
  if (row) return rowToProduct(row);
  const enr = store().pr?.products?.[asin];
  if (enr) {
    return rowToProduct({
      asin,
      title: enr.title,
      price_egp: enr.price_egp,
      rating: enr.rating,
      reviews: enr.reviews,
      category: "electronics",
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
  const leaf = leafBsr(asin);
  const date = (scrapedAt() ?? "").slice(0, 10);
  const row = (store().bs?.all ?? []).find((r: Any) => r.asin === asin);
  return {
    asin,
    points: leaf ? [{ date, value: leaf.rank }] : [],
    pricePoints: row?.price_egp != null ? [{ date, value: row.price_egp }] : [],
    provenance: prov("amazon_html_product", "medium", false, "Real BSR snapshot — history builds with each daily run."),
  };
}

export function reviews(asin: string): Review[] {
  const list: Any[] = store().pr?.products?.[asin]?.reviews_list ?? [];
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

/** Real keywords from Google Trends EG (written by the trends worker). Null until present. */
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
      provenance: prov("google_trends", "low", true, "Google Trends Egypt — relative interest, not search volume."),
    }))
    .sort((a, b) => b.demandScore - a.demandScore);
  return opts.limit ? list.slice(0, opts.limit) : list;
}
