/**
 * Proves the append-only snapshot machinery: Movers must surface a product whose
 * best-seller rank IMPROVED over the window (not one that worsened), and
 * bsrHistory must return the full multi-point series. node:fs is mocked with a
 * 2-snapshot fixture so this is hermetic — it never touches the real data files.
 */
import { describe, it, expect, vi } from "vitest";

const FILES: Record<string, unknown> = {
  "bestsellers.json": {
    schema_version: 2,
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
  "products.json": { products: {} },
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
