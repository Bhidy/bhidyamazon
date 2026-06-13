/**
 * Proves the append-only snapshot machinery: Movers must surface a product whose
 * best-seller rank IMPROVED over the window (not one that worsened), and
 * bsrHistory must return the full multi-point series. node:fs is mocked with a
 * 2-snapshot fixture so this is hermetic — it never touches the real data files.
 */
import { describe, it, expect, vi } from "vitest";

const FILES: Record<string, unknown> = {
  "bestsellers.json": {
    schema_version: 3, // must match real-schema.ts — invalid versions are rejected
    scraped_at: "2026-06-08T09:00:00Z",
    categories: {
      electronics: [
        { asin: "A1", rank: 3, price_egp: 100, category: "electronics", title: "Riser" },
        { asin: "A2", rank: 8, price_egp: 50, category: "electronics", title: "Faller" },
      ],
    },
    all: [
      { asin: "A1", rank: 3, price_egp: 100, category: "electronics", title: "Riser" },
      { asin: "A2", rank: 8, price_egp: 50, category: "electronics", title: "Faller" },
    ],
  },
  "products.json": {
    schema_version: 3,
    products: {
      // A1 carries a mix of Egypt + foreign reviews (as the dp page does): the
      // Egypt-only guardrail must surface ONLY the Egypt ones.
      A1: {
        asin: "A1",
        brand: "Acme",
        reviews_list: [
          { review_id: "EG1", rating: 5, title: "ممتاز", body: "حلو", date: "Reviewed in Egypt on 12 May 2026", lang: "ar" },
          { review_id: "EG2", rating: 2, title: "broke", body: "fragile broken", date: "Reviewed in Egypt on 3 May 2026", lang: "en" },
          { review_id: "UAE1", rating: 5, title: "great", body: "fast to dubai", date: "Reviewed in the United Arab Emirates on 1 May 2026", lang: "en" },
          { review_id: "US1", rating: 1, title: "bad", body: "overseas", date: "Reviewed in the United States on 3 April 2026", lang: "en" },
        ],
        offer_count: 9,
        offers: [
          { seller_name: "MidCo", seller_id: "S2", price_egp: 110, fba: false, condition: "New", is_buybox: false },
          { seller_name: "TopCo", seller_id: "S1", price_egp: 100, fba: true, condition: "New", is_buybox: true },
          { seller_name: "CheapCo", seller_id: "S3", price_egp: 95, fba: false, condition: "Used", is_buybox: false },
        ],
      },
      A2: { asin: "A2", brand: "Globex", offer_count: 1 },
    },
  },
  "keywords.json": { keywords: [] },
  "snapshots.json": {
    schema_version: 1,
    snapshots: {
      // A1 climbed #9 → #3 (rising); A2 slipped #4 → #8 (must be excluded).
      A1: [
        { date: "2026-06-07", rank: 9, price: 110, category: "electronics" },
        { date: "2026-06-08", rank: 3, price: 100, category: "electronics" },
      ],
      A2: [
        { date: "2026-06-07", rank: 4, price: 48, category: "electronics" },
        { date: "2026-06-08", rank: 8, price: 50, category: "electronics" },
      ],
    },
  },
};

vi.mock("node:fs", () => ({
  existsSync: () => true,
  statSync: () => ({ mtimeMs: 1 }),
  readFileSync: (p: string) => JSON.stringify(FILES[String(p).split("/").pop() as string] ?? {}),
}));

import * as store from "@/lib/real-store";

describe("real-store · snapshot-driven movers", () => {
  it("surfaces only the product whose rank improved", () => {
    const m = store.movers({ period: "daily" });
    expect(m.map((r) => r.product.asin)).toEqual(["A1"]); // faller A2 excluded
  });

  it("reports a positive rank-velocity and gain for the riser", () => {
    const [top] = store.movers({ period: "daily" });
    expect(top.riseScore).toBeGreaterThan(0);
    expect(top.gainPct).toBeGreaterThan(0); // #9 → #3 ≈ +200%
    expect(top.listType).toBe("movers");
  });

  it("respects the category filter", () => {
    expect(store.movers({ categoryNode: "beauty" })).toHaveLength(0);
    expect(store.movers({ categoryNode: "electronics" })).toHaveLength(1);
  });
});

describe("real-store · snapshot-driven bsrHistory", () => {
  it("returns the full multi-point rank + price series", () => {
    const h = store.bsrHistory("A1");
    expect(h.points.map((p) => p.value)).toEqual([9, 3]);
    expect(h.pricePoints.map((p) => p.value)).toEqual([110, 100]);
  });
});

describe("real-store · Egypt-only review guardrail", () => {
  it("reviews() excludes non-Egypt reviews", () => {
    const rl = store.reviews("A1");
    expect(rl.map((r) => r.reviewId)).toEqual(["EG1", "EG2"]); // UAE1, US1 dropped
    for (const r of rl) expect(r.reviewedAt).toContain("Egypt");
  });

  it("sentimentSummary() analyses only the Egypt sample", () => {
    const s = store.sentimentSummary("A1");
    expect(s.analysedCount).toBe(2); // not 4 — foreign reviews never counted
    // EG1 (5★ positive) + EG2 (2★ negative) → 50/0/50, foreign US 1★ excluded.
    expect(s.positivePct).toBe(50);
    expect(s.negativePct).toBe(50);
    expect(s.langMix.ar).toBe(1);
    expect(s.langMix.en).toBe(1);
  });
});

describe("real-store · offers (per-seller, price-sorted)", () => {
  it("maps and sorts offers cheapest-first", () => {
    const book = store.offers("A1");
    expect(book.offers.map((o) => o.priceEgp)).toEqual([95, 100, 110]);
    expect(book.offers[0].sellerName).toBe("CheapCo");
  });

  it("flags the buy-box and carries fulfilment + condition", () => {
    const book = store.offers("A1");
    const bb = book.offers.find((o) => o.isBuyBox)!;
    expect(bb.sellerName).toBe("TopCo");
    expect(bb.fba).toBe(true);
    const used = book.offers.find((o) => o.sellerId === "S3")!;
    expect(used.condition).toBe("Used");
    expect(used.fba).toBe(false);
  });

  it("exposes reported count + an amazon.eg offers deep link", () => {
    const book = store.offers("A1");
    expect(book.reportedOfferCount).toBe(9);
    expect(book.amazonOffersUrl).toBe("https://www.amazon.eg/gp/offer-listing/A1");
  });

  it("returns an empty book (not an error) when no offers scraped", () => {
    const book = store.offers("A2");
    expect(book.offers).toEqual([]);
    expect(book.amazonOffersUrl).toContain("/A2");
  });
});

describe("real-store · sellers (brand axis) & similar", () => {
  it("aggregates sellers by brand from tracked products", () => {
    const names = store.sellers().map((s) => s.name).sort();
    expect(names).toEqual(["Acme", "Globex"]);
  });

  it("resolves a seller profile by slug with analysis", () => {
    const acme = store.sellers().find((s) => s.name === "Acme")!;
    const profile = store.seller(acme.slug)!;
    expect(profile.name).toBe("Acme");
    expect(profile.products.map((p) => p.asin)).toContain("A1");
    expect(profile.plays.length).toBeGreaterThan(0);
  });

  it("similarProducts excludes self and stays in-category", () => {
    const sim = store.similarProducts("A1", 6);
    expect(sim.map((p) => p.asin)).not.toContain("A1");
    expect(sim.every((p) => p.categoryNode === "electronics")).toBe(true);
  });
});
