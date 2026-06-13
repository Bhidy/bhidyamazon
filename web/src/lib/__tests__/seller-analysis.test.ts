import { describe, it, expect } from "vitest";
import {
  profileFromProducts,
  rankSimilar,
  slugifySeller,
  summariesFromProducts,
} from "@/lib/seller-analysis";
import type { Product, Provenance } from "@/lib/types";

const PROV: Provenance = {
  source: "test",
  fetchedAt: "2026-06-13T00:00:00Z",
  isEstimated: false,
  confidence: "high",
};

function p(over: Partial<Product> & Pick<Product, "asin">): Product {
  return {
    titleEn: over.asin,
    categoryNode: "automotive",
    provenance: PROV,
    ...over,
  } as Product;
}

const PRODUCTS: Product[] = [
  p({ asin: "A1", brand: "Acme", categoryNode: "automotive", priceEgp: 100, rating: 4.5, reviewCount: 800, bsr: 3 }),
  p({ asin: "A2", brand: "Acme", categoryNode: "automotive", priceEgp: 120, rating: 3.2, reviewCount: 300, bsr: 40, breakComplaintCount: 2 }),
  p({ asin: "A3", brand: "Acme", categoryNode: "home", priceEgp: 90, rating: 4.1, reviewCount: 50, bsr: 8, offerCount: 15 }),
  p({ asin: "B1", brand: "Globex", categoryNode: "automotive", priceEgp: 105, rating: 4.0, reviewCount: 20, bsr: 12 }),
  p({ asin: "N1", categoryNode: "automotive", priceEgp: 110 }), // no brand → excluded from sellers
];

describe("seller-analysis · slug", () => {
  it("slugifies ASCII brand names", () => {
    expect(slugifySeller("Acme Co.")).toBe("acme-co");
    expect(slugifySeller("WD-40")).toBe("wd-40");
  });
  it("encodes non-ASCII (Arabic) names instead of collapsing to empty", () => {
    const slug = slugifySeller("سوق كادو");
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).not.toBe("-");
  });
});

describe("seller-analysis · summaries", () => {
  const sums = summariesFromProducts(PRODUCTS, PROV);

  it("groups by brand and excludes brand-less products", () => {
    expect(sums.map((s) => s.name).sort()).toEqual(["Acme", "Globex"]);
  });

  it("aggregates Acme correctly", () => {
    const acme = sums.find((s) => s.name === "Acme")!;
    expect(acme.productCount).toBe(3);
    expect(acme.totalReviews).toBe(1150); // 800+300+50
    expect(acme.bestBsr).toBe(3);
    expect(acme.minPriceEgp).toBe(90);
    expect(acme.maxPriceEgp).toBe(120);
    expect(acme.categories.sort()).toEqual(["automotive", "home"]);
    expect(acme.avgRating).toBeCloseTo((4.5 + 3.2 + 4.1) / 3, 5);
  });

  it("sorts strongest seller first (by product count)", () => {
    expect(sums[0].name).toBe("Acme");
  });
});

describe("seller-analysis · profile competitive intelligence", () => {
  const profile = profileFromProducts("acme", PRODUCTS, PROV)!;

  it("resolves by slug and attaches products", () => {
    expect(profile).toBeTruthy();
    expect(profile.products).toHaveLength(3);
  });

  it("derives strengths from real signals (top-10 BSR, social proof)", () => {
    const joined = profile.strengths.join(" ");
    expect(joined).toMatch(/top-10|reviews/i);
  });

  it("flags weaknesses (sub-3.7 rating, breakage, contested listing)", () => {
    const joined = profile.weaknesses.join(" ");
    expect(joined).toMatch(/below 3.7/i);
    expect(joined).toMatch(/breakage|durability/i);
    expect(joined).toMatch(/contested|sellers/i);
  });

  it("always produces actionable plays", () => {
    expect(profile.plays.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown seller", () => {
    expect(profileFromProducts("nope", PRODUCTS, PROV)).toBeUndefined();
  });
});

describe("seller-analysis · similar ranking", () => {
  it("prefers same category, ranked by price proximity, excludes self", () => {
    const self = PRODUCTS[0]; // A1 automotive @100
    const pool = PRODUCTS.filter((x) => x.asin !== "A1");
    const sim = rankSimilar(self, pool, 6);
    expect(sim.map((x) => x.asin)).not.toContain("A1");
    // automotive items first; B1(@105) closer to 100 than A2(@120)
    expect(sim[0].asin).toBe("B1");
    const autos = sim.filter((x) => x.categoryNode === "automotive").map((x) => x.asin);
    expect(autos.indexOf("B1")).toBeLessThan(autos.indexOf("A2"));
  });

  it("respects the limit", () => {
    expect(rankSimilar(PRODUCTS[0], PRODUCTS.slice(1), 2)).toHaveLength(2);
  });
});
