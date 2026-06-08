import { describe, expect, it } from "vitest";
import {
  computeWinningScore,
  applyOverride,
  WINNING_SCORE_CONFIG,
  EMPTY_CONTEXT,
  type ScoreContext,
} from "@/lib/winning-score";
import type {
  CriterionKey,
  CriterionScore,
  Product,
  WinningScoreConfig,
  WpsOverrides,
} from "@/lib/types";

/**
 * Institutional quality gate for the Winning Product Score engine.
 *
 * Every expected value is HAND-DERIVED from the documented rules and the car
 * preset (size 15/40 cm, weight 0.15/1.0 kg, price 40/400/1500 EGP, verdict
 * 75/60/45, minCompleteness 0.6, required category/price/size). Deterministic
 * criteria are asserted to 2 decimals; the two log/ordinal criteria
 * (competition, demand) are asserted by direction + band, which is the honest
 * thing to lock for an ordinal signal. Synthetic products only — no I/O.
 */

const ASIN = "TEST00001";

function product(overrides: Partial<Product> = {}): Product {
  return {
    asin: ASIN,
    titleEn: "Car phone holder mount",
    categoryNode: "automotive",
    provenance: { source: "test", fetchedAt: "2026-06-09T00:00:00Z", isEstimated: false, confidence: "high" },
    ...overrides,
  };
}

/** Read one criterion out of a full computeWinningScore run. */
function crit(p: Product, key: CriterionKey, ctx: ScoreContext = EMPTY_CONTEXT): CriterionScore {
  return computeWinningScore(p, {}, WINNING_SCORE_CONFIG, ctx).criteria.find((c) => c.key === key)!;
}

/* ───────────────────────────── per-criterion ────────────────────────────── */

describe("category — measured fact", () => {
  it("automotive node ⇒ 100, high confidence, fact", () => {
    const c = crit(product(), "category");
    expect(c.subscore).toBe(100);
    expect(c.confidence).toBe("high");
    expect(c.signal).toBe("fact");
  });
  it("non-car node with no car keyword ⇒ ~5 (tanked)", () => {
    const c = crit(product({ categoryNode: "home", titleEn: "Generic kitchen widget" }), "category");
    expect(c.subscore).toBe(5);
    expect(c.band).toBe("weak");
  });
  it("car keyword outside automotive node ⇒ 60, ordinal/medium", () => {
    const c = crit(product({ categoryNode: "home", titleEn: "Universal car seat organizer" }), "category");
    expect(c.subscore).toBe(60);
    expect(c.confidence).toBe("medium");
  });
});

describe("size — linear decay 15→40 cm on the longest edge", () => {
  it("longest edge 10 cm (≤15) ⇒ 100", () => {
    expect(crit(product({ itemDimensionsCm: { l: 10, w: 5, h: 2 } }), "size").subscore).toBe(100);
  });
  it("longest edge 40 cm (≥40) ⇒ 0", () => {
    expect(crit(product({ itemDimensionsCm: { l: 40, w: 35, h: 0 } }), "size").subscore).toBe(0);
  });
  it("longest edge 27.5 cm ⇒ 50 (midpoint)", () => {
    // decay(27.5,15,40) = 100*(40-27.5)/(40-15) = 100*12.5/25 = 50
    expect(crit(product({ itemDimensionsCm: { l: 27.5, w: 5, h: 5 } }), "size").subscore).toBe(50);
  });
  it("no dimensions ⇒ unavailable", () => {
    const c = crit(product(), "size");
    expect(c.available).toBe(false);
    expect(c.subscore).toBeNull();
  });
});

describe("weight — linear decay 0.15→1.0 kg", () => {
  it("0.08 kg ⇒ 100", () => {
    expect(crit(product({ itemWeightKg: 0.08 }), "weight").subscore).toBe(100);
  });
  it("0.575 kg ⇒ 50 (midpoint)", () => {
    // decay(0.575,0.15,1.0) = 100*(1.0-0.575)/0.85 = 100*0.425/0.85 = 50
    expect(crit(product({ itemWeightKg: 0.575 }), "weight").subscore).toBe(50);
  });
  it("missing weight ⇒ unavailable", () => {
    expect(crit(product(), "weight").available).toBe(false);
  });
});

describe("material — attr fact, title inference, electronic cap", () => {
  it('"Plastic" ⇒ 100, fact', () => {
    const c = crit(product({ material: "Plastic" }), "material");
    expect(c.subscore).toBe(100);
    expect(c.signal).toBe("fact");
  });
  it('"Glass" ⇒ 15 (fragile)', () => {
    expect(crit(product({ material: "Glass" }), "material").subscore).toBe(15);
  });
  it('"Stainless Steel" ⇒ 45 (durable but heavier)', () => {
    expect(crit(product({ material: "Stainless Steel" }), "material").subscore).toBe(45);
  });
  it("plastic + electronic title ⇒ capped at 25, estimate/low", () => {
    const c = crit(product({ material: "Plastic", titleEn: "Wireless car charger pad" }), "material");
    expect(c.subscore).toBe(25);
    expect(c.confidence).toBe("low");
  });
  it("no attr, good-material title ⇒ 70 estimate/low", () => {
    const c = crit(product({ titleEn: "Silicone car cup mat" }), "material");
    expect(c.subscore).toBe(70);
    expect(c.signal).toBe("estimate");
  });
  it("no attr, no hint ⇒ unavailable", () => {
    expect(crit(product({ titleEn: "Car gadget thing" }), "material").available).toBe(false);
  });
});

describe("breakRisk — material baseline minus complaint rate (always low conf)", () => {
  it("plastic, no reviews ⇒ 85 baseline", () => {
    const c = crit(product({ material: "Plastic" }), "breakRisk");
    expect(c.subscore).toBe(85);
    expect(c.confidence).toBe("low");
  });
  it("glass ⇒ 20 baseline", () => {
    expect(crit(product({ material: "Glass" }), "breakRisk").subscore).toBe(20);
  });
  it("plastic, 2 break complaints in 8 reviews ⇒ 47.5", () => {
    // base 85 - (2/8)*100*1.5 = 85 - 37.5 = 47.5
    const c = crit(product({ material: "Plastic", reviewSampleSize: 8, breakComplaintCount: 2 }), "breakRisk");
    expect(c.subscore).toBe(47.5);
  });
  it("no material ⇒ 60 neutral baseline", () => {
    expect(crit(product(), "breakRisk").subscore).toBe(60);
  });
});

describe("returnRisk — rating, model-fit penalty, complaint rate (always low conf)", () => {
  it("4.5★ generic ⇒ 80", () => {
    // (4.5-2.5)/2.5*100 = 80
    expect(crit(product({ rating: 4.5 }), "returnRisk").subscore).toBe(80);
  });
  it("model/year-specific title ⇒ −40 penalty (80→40)", () => {
    const c = crit(product({ rating: 4.5, titleEn: "Seat cover for Toyota Corolla 2015" }), "returnRisk");
    expect(c.subscore).toBe(40);
    expect(c.reason).toMatch(/fit/i);
  });
  it("fit complaints reduce it (5★, 2 of 8) ⇒ 75", () => {
    // base 100 - min(30, (2/8)*100=25) = 75
    expect(crit(product({ rating: 5, reviewSampleSize: 8, fitComplaintCount: 2 }), "returnRisk").subscore).toBe(75);
  });
  it("no rating ⇒ 50 baseline", () => {
    expect(crit(product(), "returnRisk").subscore).toBe(50);
  });
});

describe("price — plateau 40–400, cheap floor, expensive decay", () => {
  it("100 EGP (in band) ⇒ 100", () => {
    expect(crit(product({ priceEgp: 100 }), "price").subscore).toBe(100);
  });
  it("400 EGP (upper edge) ⇒ 100", () => {
    expect(crit(product({ priceEgp: 400 }), "price").subscore).toBe(100);
  });
  it("20 EGP (below floor) ⇒ 85", () => {
    // 70 + 30*20/40 = 70 + 15 = 85
    expect(crit(product({ priceEgp: 20 }), "price").subscore).toBe(85);
  });
  it("950 EGP ⇒ 50 (midpoint of 400→1500 decay)", () => {
    // decay(950,400,1500) = 100*(1500-950)/1100 = 50
    expect(crit(product({ priceEgp: 950 }), "price").subscore).toBe(50);
  });
  it("1500 EGP ⇒ 0", () => {
    expect(crit(product({ priceEgp: 1500 }), "price").subscore).toBe(0);
  });
  it("no price ⇒ unavailable", () => {
    expect(crit(product(), "price").available).toBe(false);
  });
});

describe("useCaseClarity — title length + image/bullet adjustments", () => {
  it("4-word title ⇒ 90", () => {
    expect(crit(product({ titleEn: "Car trash can bin" }), "useCaseClarity").subscore).toBe(90);
  });
  it("4-word title + 7 images ⇒ 98", () => {
    expect(crit(product({ titleEn: "Car trash can bin", imageCount: 7 }), "useCaseClarity").subscore).toBe(98);
  });
  it("4-word title + only 1 image ⇒ 80", () => {
    expect(crit(product({ titleEn: "Car trash can bin", imageCount: 1 }), "useCaseClarity").subscore).toBe(80);
  });
});

describe("competition / demand — ordinal, asserted by direction", () => {
  const weakNiche: ScoreContext = { peerReviewCounts: [10, 20, 30], peerBrandCounts: { A: 1, B: 1, C: 1 }, peerCount: 5, peerImageCounts: [] };
  const entrenched: ScoreContext = { peerReviewCounts: [4000, 6000, 9000], peerBrandCounts: { Bosch: 9, Other: 1 }, peerCount: 80, peerImageCounts: [] };

  it("fragmented low-review niche ⇒ strong (weak competition)", () => {
    const c = crit(product(), "competition", weakNiche);
    expect(c.band).toBe("strong");
    expect(c.subscore).toBeGreaterThan(70);
  });
  it("entrenched high-review niche ⇒ weak", () => {
    const c = crit(product(), "competition", entrenched);
    expect(c.subscore).toBeLessThan(45);
  });
  it("no peer data ⇒ competition unavailable", () => {
    expect(crit(product(), "competition", EMPTY_CONTEXT).available).toBe(false);
  });
  it("demand = within-niche review-count percentile (no fabricated saturation)", () => {
    // peerReviewCounts [10,20,30,40], reviewCount 30 ⇒ percentile 3/4 = 75
    const ctx: ScoreContext = { peerReviewCounts: [10, 20, 30, 40], peerBrandCounts: {}, peerCount: 4, peerImageCounts: [] };
    expect(crit(product({ reviewCount: 30 }), "demand", ctx).subscore).toBe(75);
  });
  it("demand: high review count ⇒ high percentile even in an entrenched niche", () => {
    // entrenched peerReviewCounts [4000,6000,9000], reviewCount 9000 ⇒ 3/3 = 100
    expect(crit(product({ reviewCount: 9000 }), "demand", entrenched).subscore).toBe(100);
  });
  it("demand unavailable without review data", () => {
    expect(crit(product(), "demand", EMPTY_CONTEXT).available).toBe(false);
  });
});

describe("sourcing / bundle — assisted + inferred", () => {
  it("unbranded ⇒ 60 with the manual-confirm reason", () => {
    const c = crit(product(), "sourcing");
    expect(c.subscore).toBe(60);
    expect(c.reason).toMatch(/AliExpress\/1688/);
  });
  it("branded ⇒ 45", () => {
    expect(crit(product({ brand: "Bosch" }), "sourcing").subscore).toBe(45);
  });
  it("multipack in automotive ⇒ 90", () => {
    // numberOfItems 4 ⇒ 80, +10 automotive = 90
    expect(crit(product({ numberOfItems: 4 }), "bundle").subscore).toBe(90);
  });
  it("single automotive item ⇒ 65", () => {
    expect(crit(product({ numberOfItems: 1 }), "bundle").subscore).toBe(65);
  });
});

/* ─────────────────────── composite math (the core) ──────────────────────── */

const miniCfg: WinningScoreConfig = {
  ...WINNING_SCORE_CONFIG,
  criteria: [
    { key: "category", weight: 60, signal: "fact", labelEn: "", labelAr: "" },
    { key: "price", weight: 40, signal: "fact", labelEn: "", labelAr: "", thresholds: { lowEgp: 40, midEgp: 400, highEgp: 1500 } },
  ],
  minCompleteness: 0.5,
  requiredCriteria: ["category"],
  verdictBands: { winner: 75, promising: 60, marginal: 45 },
};

describe("composite — renormalize over AVAILABLE weights (never deflate)", () => {
  it("both criteria available, both 100 ⇒ score 100, completeness 1.0, winner", () => {
    const r = computeWinningScore(product({ priceEgp: 100 }), {}, miniCfg);
    expect(r.score).toBe(100);
    expect(r.completeness).toBe(1);
    expect(r.verdict).toBe("winner");
  });
  it("price missing ⇒ score is STILL 100 (renormalized, not 60)", () => {
    const r = computeWinningScore(product(), {}, miniCfg); // no price
    expect(r.score).toBe(100); // not deflated to 60 by the missing 40-weight criterion
    expect(r.completeness).toBe(0.6); // 60/100 weight-share
    const cat = r.criteria.find((c) => c.key === "category")!;
    expect(cat.effectiveWeight).toBe(1); // renormalized to the only available criterion
  });
});

describe("composite — completeness is WEIGHT-share, not count-share", () => {
  const wCfg: WinningScoreConfig = {
    ...WINNING_SCORE_CONFIG,
    criteria: [
      { key: "category", weight: 70, signal: "fact", labelEn: "", labelAr: "" },
      { key: "size", weight: 20, signal: "fact", labelEn: "", labelAr: "", thresholds: { smallCm: 15, largeCm: 40 } },
      { key: "weight", weight: 10, signal: "fact", labelEn: "", labelAr: "", thresholds: { lightKg: 0.15, heavyKg: 1 } },
    ],
    minCompleteness: 0.05,
    requiredCriteria: [],
  };
  it("missing the heavy criterion drops completeness more than missing a light one", () => {
    const missingWeight = computeWinningScore(product({ itemDimensionsCm: { l: 5, w: 5, h: 5 } }), {}, wCfg);
    const missingSize = computeWinningScore(product({ itemWeightKg: 0.1 }), {}, wCfg);
    expect(missingWeight.completeness).toBe(0.9); // (70+20)/100 — missing weight(10)
    expect(missingSize.completeness).toBe(0.8); // (70+10)/100 — missing size(20)
    expect(missingWeight.completeness).toBeGreaterThan(missingSize.completeness);
  });
});

describe("gating — completeness floor + required criteria", () => {
  it("default preset: a product with no dimensions is gated (size required)", () => {
    const r = computeWinningScore(product({ priceEgp: 100 }), {}, WINNING_SCORE_CONFIG, EMPTY_CONTEXT);
    expect(r.gated).toBe(true);
    expect(r.verdict).toBe("insufficient-data");
  });
  it("required criterion missing gates even when completeness math passes", () => {
    const cfg: WinningScoreConfig = { ...miniCfg, requiredCriteria: ["price"], minCompleteness: 0 };
    const r = computeWinningScore(product(), {}, cfg); // price missing
    expect(r.gated).toBe(true);
    expect(r.verdict).toBe("insufficient-data");
  });
  it("low completeness gates", () => {
    const cfg: WinningScoreConfig = { ...miniCfg, requiredCriteria: [], minCompleteness: 0.95 };
    const r = computeWinningScore(product(), {}, cfg); // only category (0.6) < 0.95
    expect(r.gated).toBe(true);
  });
});

describe("verdict bands — exact boundaries via an override-pinned score", () => {
  const oneCfg: WinningScoreConfig = {
    ...WINNING_SCORE_CONFIG,
    criteria: [{ key: "category", weight: 100, signal: "fact", labelEn: "", labelAr: "" }],
    requiredCriteria: [],
    minCompleteness: 0,
    verdictBands: { winner: 75, promising: 60, marginal: 45 },
  };
  const at = (s: number) => computeWinningScore(product(), { [ASIN]: { category: { subscore: s, updatedAt: "t" } } }, oneCfg).verdict;
  it("75 ⇒ winner, 60 ⇒ promising, 45 ⇒ marginal, 44 ⇒ avoid", () => {
    expect(at(75)).toBe("winner");
    expect(at(60)).toBe("promising");
    expect(at(45)).toBe("marginal");
    expect(at(44)).toBe("avoid");
  });
});

describe("composite confidence — inherits the worst available tier", () => {
  it("all-fact ⇒ high confidence, not estimated", () => {
    const r = computeWinningScore(product({ priceEgp: 100 }), {}, miniCfg);
    expect(r.provenance.confidence).toBe("high");
    expect(r.provenance.isEstimated).toBe(false);
  });
  it("any low-confidence available criterion ⇒ low composite confidence", () => {
    const covCfg: WinningScoreConfig = {
      ...WINNING_SCORE_CONFIG,
      criteria: [
        { key: "category", weight: 50, signal: "fact", labelEn: "", labelAr: "" },
        { key: "sourcing", weight: 50, signal: "estimate", labelEn: "", labelAr: "" },
      ],
      minCompleteness: 0,
      requiredCriteria: [],
    };
    const r = computeWinningScore(product(), {}, covCfg);
    expect(r.provenance.confidence).toBe("low");
    expect(r.confidenceCoverage).toBe(0.5); // only category trusted of the 50/50
  });
});

/* ───────────────────────────── overrides ────────────────────────────────── */

describe("overrides — hybrid infer + override", () => {
  const covCfg: WinningScoreConfig = {
    ...WINNING_SCORE_CONFIG,
    criteria: [
      { key: "category", weight: 50, signal: "fact", labelEn: "", labelAr: "" },
      { key: "sourcing", weight: 50, signal: "estimate", labelEn: "", labelAr: "" },
    ],
    minCompleteness: 0,
    requiredCriteria: [],
  };

  it("confirm raises confidence to user-confirmed and lifts confidenceCoverage", () => {
    const before = computeWinningScore(product(), {}, covCfg);
    const after = computeWinningScore(product(), { [ASIN]: { sourcing: { confirm: true, updatedAt: "t" } } }, covCfg);
    expect(before.confidenceCoverage).toBe(0.5);
    expect(after.confidenceCoverage).toBe(1);
    const s = after.criteria.find((c) => c.key === "sourcing")!;
    expect(s.confidence).toBe("user-confirmed");
    expect(s.overridden).toBe(true);
  });

  it("subscore override flips an unavailable criterion to available", () => {
    const ov: WpsOverrides = { [ASIN]: { size: { subscore: 90, updatedAt: "t" } } };
    const r = computeWinningScore(product(), ov, WINNING_SCORE_CONFIG, EMPTY_CONTEXT);
    const size = r.criteria.find((c) => c.key === "size")!;
    expect(size.available).toBe(true);
    expect(size.subscore).toBe(90);
    expect(size.confidence).toBe("user-confirmed");
  });

  it("confirming a null criterion does NOT fabricate a value", () => {
    const out = applyOverride(
      { key: "size", subscore: null, band: "unknown", confidence: "low", signal: "fact", available: false, overridden: false, reason: "no dims", effectiveWeight: 0 },
      { confirm: true, updatedAt: "t" },
    );
    expect(out.available).toBe(false);
    expect(out.subscore).toBeNull();
    expect(out.reason).toMatch(/cannot confirm/i);
  });

  it("overrides are a pure parameter — no shared mutable state", () => {
    const a = computeWinningScore(product({ priceEgp: 100 }), {}, miniCfg);
    computeWinningScore(product({ priceEgp: 100 }), { [ASIN]: { category: { subscore: 1, updatedAt: "t" } } }, miniCfg);
    const c = computeWinningScore(product({ priceEgp: 100 }), {}, miniCfg);
    expect(c.score).toBe(a.score); // the override call didn't leak into later calls
  });
});

describe("determinism", () => {
  it("same inputs ⇒ deep-equal output", () => {
    const ctx: ScoreContext = { peerReviewCounts: [10, 20, 30], peerBrandCounts: { A: 2, B: 1 }, peerCount: 8, peerImageCounts: [4, 6] };
    const p = product({ priceEgp: 99, itemDimensionsCm: { l: 9, w: 4, h: 3 }, itemWeightKg: 0.1, material: "Plastic", rating: 4.2, reviewCount: 25 });
    expect(computeWinningScore(p, {}, WINNING_SCORE_CONFIG, ctx)).toEqual(computeWinningScore(p, {}, WINNING_SCORE_CONFIG, ctx));
  });
});

describe("WINNING_SCORE_CONFIG — preset sanity", () => {
  const cfg = WINNING_SCORE_CONFIG;
  it("has all 12 criteria, unique keys, weights sum to 100", () => {
    expect(cfg.criteria).toHaveLength(12);
    const keys = cfg.criteria.map((c) => c.key);
    expect(new Set(keys).size).toBe(12);
    expect(cfg.criteria.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });
  it("verdict bands strictly descending, required ⊆ keys, completeness in (0,1]", () => {
    expect(cfg.verdictBands.winner).toBeGreaterThan(cfg.verdictBands.promising);
    expect(cfg.verdictBands.promising).toBeGreaterThan(cfg.verdictBands.marginal);
    const keys = new Set(cfg.criteria.map((c) => c.key));
    for (const k of cfg.requiredCriteria) expect(keys.has(k)).toBe(true);
    expect(cfg.minCompleteness).toBeGreaterThan(0);
    expect(cfg.minCompleteness).toBeLessThanOrEqual(1);
  });
});
