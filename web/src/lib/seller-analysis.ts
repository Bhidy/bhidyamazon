/**
 * Pure seller/competition analysis over a list of domain Products.
 *
 * Kept provider-agnostic on purpose: real-store feeds it scraped amazon.eg
 * products, the seed layer feeds it synthesized ones, and the SAME competitive
 * logic runs for both. Every signal here is derived from observed fields
 * (rating, BSR, price, review count, complaint counts, offer count) — no
 * fabricated metrics. "Seller" = the brand/store byline on the listings.
 */
import type { Product, Provenance, SellerProfile, SellerSummary } from "@/lib/types";

/** URL-safe slug for a brand/seller name (stable; encodes non-ASCII names). */
export function slugifySeller(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || encodeURIComponent(name.trim().toLowerCase());
}

function groupByBrand(products: Product[]): Map<string, Product[]> {
  const m = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.brand) continue;
    const list = m.get(p.brand);
    if (list) list.push(p);
    else m.set(p.brand, [p]);
  }
  return m;
}

function summaryFor(name: string, items: Product[], provenance: Provenance): SellerSummary {
  const ratings = items.map((p) => p.rating).filter((r): r is number => r != null);
  const prices = items.map((p) => p.priceEgp).filter((v): v is number => v != null);
  const bsrs = items.map((p) => p.bsr).filter((v): v is number => v != null);
  return {
    slug: slugifySeller(name),
    name,
    productCount: items.length,
    categories: [...new Set(items.map((p) => p.categoryNode).filter((c) => c !== "unknown"))],
    avgRating: ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : undefined,
    totalReviews: items.reduce((s, p) => s + (p.reviewCount ?? 0), 0),
    minPriceEgp: prices.length ? Math.min(...prices) : undefined,
    maxPriceEgp: prices.length ? Math.max(...prices) : undefined,
    bestBsr: bsrs.length ? Math.min(...bsrs) : undefined,
    provenance,
  };
}

/** Brand/store sellers aggregated across products, strongest first. */
export function summariesFromProducts(
  products: Product[],
  provenance: Provenance,
): SellerSummary[] {
  return [...groupByBrand(products).entries()]
    .map(([name, items]) => summaryFor(name, items, provenance))
    .sort(
      (a, b) =>
        b.productCount - a.productCount ||
        (a.bestBsr ?? Infinity) - (b.bestBsr ?? Infinity) ||
        b.totalReviews - a.totalReviews,
    );
}

/** Full seller (brand) profile + data-derived competitive intelligence. */
export function profileFromProducts(
  slug: string,
  products: Product[],
  provenance: Provenance,
): SellerProfile | undefined {
  const entry = [...groupByBrand(products).entries()].find(([name]) => slugifySeller(name) === slug);
  if (!entry) return undefined;
  const [name, items] = entry;
  const summary = summaryFor(name, items, provenance);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const plays: string[] = [];

  const leaders = items.filter((p) => p.bsr != null && p.bsr <= 10);
  if (leaders.length)
    strengths.push(
      `${leaders.length} top-10 best-seller-rank listing${leaders.length > 1 ? "s" : ""} — strong category visibility.`,
    );
  if (summary.avgRating != null && summary.avgRating >= 4.3)
    strengths.push(`High average rating (${summary.avgRating.toFixed(1)}★) builds buyer trust.`);
  if (summary.totalReviews >= 1000)
    strengths.push(
      `${summary.totalReviews.toLocaleString()} total reviews — established social proof.`,
    );
  if (!strengths.length)
    strengths.push("No dominant moat in the tracked sample — contestable across the board.");

  const weak = items.filter((p) => p.rating != null && p.rating < 3.7);
  if (weak.length)
    weaknesses.push(
      `${weak.length} product${weak.length > 1 ? "s" : ""} rated below 3.7★ — quality gaps to beat on.`,
    );
  const breakers = items.filter((p) => (p.breakComplaintCount ?? 0) > 0);
  if (breakers.length)
    weaknesses.push(`${breakers.length} listing(s) with durability/breakage complaints in reviews.`);
  const contested = items.filter((p) => (p.offerCount ?? 0) >= 10);
  if (contested.length)
    weaknesses.push(
      `${contested.length} heavily-contested listing(s) with 10+ sellers — thin margins, price wars.`,
    );
  if (!weaknesses.length)
    weaknesses.push("No glaring quality or pricing weakness in the tracked sample.");

  if (weak.length)
    plays.push("Source a higher-quality variant of their lowest-rated SKU and win on reviews.");
  if (summary.minPriceEgp != null)
    plays.push(
      `Their floor price is EGP ${summary.minPriceEgp.toLocaleString()} — undercut on a comparable, well-reviewed listing.`,
    );
  if (summary.categories.length === 1)
    plays.push(
      "Concentrated in one category — out-merchandise them there (better images, bullets, bundles).",
    );
  plays.push("Track their price and BSR daily; strike when a top SKU slips in rank or runs low on stock.");

  return { ...summary, products: items, strengths, weaknesses, plays };
}

/** Similar products: same category first (price-proximity ranked), then same
 *  brand, excluding the product itself. `pool` should already exclude `self`. */
export function rankSimilar(self: Product, pool: Product[], limit = 6): Product[] {
  const price = self.priceEgp ?? null;
  const priceGap = (p: Product) =>
    price != null && p.priceEgp != null ? Math.abs(p.priceEgp - price) : Number.MAX_SAFE_INTEGER;

  const sameCat = pool
    .filter((p) => self.categoryNode !== "unknown" && p.categoryNode === self.categoryNode)
    .sort((a, b) => priceGap(a) - priceGap(b));
  const sameCatSet = new Set(sameCat.map((p) => p.asin));
  const sameBrand = pool.filter(
    (p) => self.brand && p.brand === self.brand && !sameCatSet.has(p.asin),
  );
  const seen = new Set<string>();
  return [...sameCat, ...sameBrand]
    .filter((p) => (seen.has(p.asin) ? false : (seen.add(p.asin), true)))
    .slice(0, limit);
}
