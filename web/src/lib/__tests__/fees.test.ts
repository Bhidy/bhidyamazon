import { describe, expect, it } from "vitest";
import {
  computeFbaFee,
  computeProfit,
  computeReferralFee,
  DEFAULT_FEE_SCHEDULE,
  getReferralRule,
} from "@/lib/fees";
import type { CalculatorInput } from "@/lib/types";

/**
 * Institutional quality gate for the fee/VAT/profit engine.
 *
 * Every expected value below is HAND-DERIVED from the documented rules and the
 * default schedule (vatRate 0.14, fbaPriceBandEgp 350, Electronics-Accessories
 * 15%→8% break at 1000, Grocery 4%→10% break at 250, small-standard FBA 15/22).
 * Tolerance is the engine's own 2-decimal rounding (<= 0.01). The derivations
 * are written inline so a reviewer can re-check the math without running code.
 */

const TOL = 0.01;

// Minimal valid input; each case overrides only the fields it exercises.
function input(overrides: Partial<CalculatorInput>): CalculatorInput {
  return {
    sellPriceEgp: 0,
    costOfGoodsEgp: 0,
    categoryNode: "home",
    fulfillment: "fbm",
    vatRegistered: false,
    ...overrides,
  };
}

describe("computeReferralFee — piecewise tiers + min-fee floor", () => {
  it("Electronics-Accessories: 15% tier applies fully at the 1000 EGP boundary", () => {
    // tiers [{<=1000: 0.15},{rest: 0.08}]; at 1000 → 1000 * 0.15 = 150.00
    const rule = getReferralRule("electronics-accessories");
    expect(computeReferralFee(1000, rule)).toBeCloseTo(150, 2);
  });

  it("Electronics-Accessories: spans both tiers above the boundary (1000@15% + 1000@8%)", () => {
    // at 2000 → 1000*0.15 + 1000*0.08 = 150 + 80 = 230.00
    const rule = getReferralRule("electronics-accessories");
    expect(computeReferralFee(2000, rule)).toBeCloseTo(230, 2);
  });

  it("Grocery: 4% first tier applies fully at the 250 EGP boundary", () => {
    // tiers [{<=250: 0.04},{rest: 0.10}]; at 250 → 250 * 0.04 = 10.00
    const rule = getReferralRule("grocery");
    expect(computeReferralFee(250, rule)).toBeCloseTo(10, 2);
  });

  it("min-fee floor: tiny Grocery order is floored at minFeeEgp (3)", () => {
    // at 50 → 50 * 0.04 = 2.00, floored up to the 3 EGP minimum
    const rule = getReferralRule("grocery");
    expect(computeReferralFee(50, rule)).toBeCloseTo(3, 2);
  });

  it("unknown category falls back to the ~12% home rule", () => {
    // getReferralRule(unknown) → home (single 0.12 tier); 500 * 0.12 = 60.00
    const rule = getReferralRule("does-not-exist");
    expect(rule.categoryNode).toBe("home");
    expect(computeReferralFee(500, rule)).toBeCloseTo(60, 2);
  });
});

describe("computeFbaFee — price-band step at 350 EGP", () => {
  it("at exactly 350 EGP uses the LOW small-standard fee (15)", () => {
    // price > 350 is false at 350 → lowPriceFeeEgp = 15
    expect(computeFbaFee(350, "small-standard")).toBeCloseTo(15, 2);
  });

  it("just above 350 EGP steps up to the HIGH small-standard fee (22)", () => {
    // price > 350 is true at 351 → highPriceFeeEgp = 22
    expect(computeFbaFee(351, "small-standard")).toBeCloseTo(22, 2);
  });

  it("no size tier yields no FBA fee (0)", () => {
    expect(computeFbaFee(1000, undefined)).toBe(0);
  });
});

describe("computeProfit — VAT model, fulfillment, margin/ROI", () => {
  // Shared scenario: Electronics-Accessories, FBA small-standard, price 1000, COGS 400.
  // referralFee = 150, fbaFee (1000>350) = 22, totalFees = 172.
  const base = {
    sellPriceEgp: 1000,
    costOfGoodsEgp: 400,
    categoryNode: "electronics-accessories",
    fulfillment: "fba" as const,
    fbaSizeTier: "small-standard",
  };

  it("VAT-registered: net revenue is price / 1.14 (output VAT stripped)", () => {
    // 1140 / 1.14 = 1000.00 exactly
    const r = computeProfit(input({ sellPriceEgp: 1140, vatRegistered: true }));
    expect(r.netRevenueEgp).toBeCloseTo(1000, 2);
  });

  it("NOT VAT-registered: net revenue equals the full consumer price", () => {
    const r = computeProfit(input({ sellPriceEgp: 1140, vatRegistered: false }));
    expect(r.netRevenueEgp).toBeCloseTo(1140, 2);
  });

  it("VAT-registered full breakdown: fee VAT is reclaimed, profit 305.19", () => {
    // netRevenue = 1000/1.14 = 877.192...; referralVat=21, fbaVat=3.08 → reclaimed,
    // feeVatCost = 0; totalCost = 400 + 172 = 572; netProfit = 877.19... - 572 = 305.19
    // margin = 305.19/1000*100 = 30.52; roi = 305.19/400*100 = 76.30
    const r = computeProfit(input({ ...base, vatRegistered: true }));
    expect(r.referralFeeEgp).toBeCloseTo(150, 2);
    expect(r.fbaFeeEgp).toBeCloseTo(22, 2);
    expect(r.totalFeesEgp).toBeCloseTo(172, 2);
    expect(r.reclaimableVatEgp).toBeCloseTo(24.08, 2);
    expect(r.totalCostEgp).toBeCloseTo(572, 2);
    expect(r.netProfitEgp).toBeCloseTo(305.19, 2);
    expect(r.marginPct).toBeCloseTo(30.52, 2);
    expect(r.roiPct).toBeCloseTo(76.3, 2);
  });

  it("NOT VAT-registered: unreclaimed fee VAT (24.08) raises cost, profit 403.92", () => {
    // netRevenue = 1000; feeVatCost = (150+22)*0.14 = 24.08; totalCost = 400+172+24.08 = 596.08
    // netProfit = 1000 - 596.08 = 403.92; margin = 40.39; roi = 100.98
    const r = computeProfit(input({ ...base, vatRegistered: false }));
    expect(r.reclaimableVatEgp).toBe(0);
    expect(r.totalCostEgp).toBeCloseTo(596.08, 2);
    expect(r.netProfitEgp).toBeCloseTo(403.92, 2);
    expect(r.marginPct).toBeCloseTo(40.39, 2);
    expect(r.roiPct).toBeCloseTo(100.98, 2);
  });

  it("FBM has no FBA fee; fees are referral-only", () => {
    // home @ 500 → referral 60, fbaFee 0
    const r = computeProfit(
      input({ sellPriceEgp: 500, costOfGoodsEgp: 200, categoryNode: "home", fulfillment: "fbm" }),
    );
    expect(r.fbaFeeEgp).toBe(0);
    expect(r.referralFeeEgp).toBeCloseTo(60, 2);
    expect(r.totalFeesEgp).toBeCloseTo(60, 2);
  });

  it("negative margin/ROI signs when sold below cost", () => {
    // home/FBM, price 200, COGS 300, non-reg: referral 24, feeVat 3.36,
    // totalCost 327.36, netProfit -127.36 → margin -63.68, roi -42.45 (all negative)
    const r = computeProfit(
      input({ sellPriceEgp: 200, costOfGoodsEgp: 300, categoryNode: "home", fulfillment: "fbm" }),
    );
    expect(r.netProfitEgp).toBeCloseTo(-127.36, 2);
    expect(r.netProfitEgp).toBeLessThan(0);
    expect(r.marginPct).toBeLessThan(0);
    expect(r.roiPct).toBeLessThan(0);
  });

  it("break-even: computeProfit at breakEvenPriceEgp yields ~0 net profit", () => {
    const seed = input({ ...base, vatRegistered: true });
    const be = computeProfit(seed).breakEvenPriceEgp;
    expect(Number.isFinite(be)).toBe(true);
    // Re-run at the solved break-even price → netProfit must be ~0 (within rounding).
    const atBe = computeProfit({ ...seed, sellPriceEgp: be });
    expect(atBe.netProfitEgp).toBeLessThanOrEqual(TOL);
    expect(atBe.netProfitEgp).toBeGreaterThanOrEqual(-TOL);
  });

  it("break-even returns the FIRST crossing when the FBA fee step creates two", () => {
    // home 12% / FBM-VAT model (non-registered) / small-standard FBA (15 → 22 at 350).
    // COGS 280: profit(p) = p − (280 + 0.12p·1.14 + fba·1.14)
    //   below band: 0.8632p − 297.1   → first crossing ≈ 344.18 (< 350)
    //   at 351:     0.8632·351 − 305.08 ≈ −2.10  → dips NEGATIVE above the step
    // A naive global bisection can land on the SECOND crossing (~353.4); the
    // solver must return the first.
    const seed = input({
      sellPriceEgp: 500,
      costOfGoodsEgp: 280,
      categoryNode: "home",
      fulfillment: "fba",
      fbaSizeTier: "small-standard",
    });
    const r = computeProfit(seed);
    expect(r.breakEvenPriceEgp).toBeLessThan(350);
    expect(r.breakEvenPriceEgp).toBeCloseTo(344.18, 0);
    // …and at that price profit is genuinely ~0.
    const atBe = computeProfit({ ...seed, sellPriceEgp: r.breakEvenPriceEgp });
    expect(Math.abs(atBe.netProfitEgp)).toBeLessThanOrEqual(TOL);
  });
});

describe("DEFAULT_FEE_SCHEDULE — sanity of the versioned schedule", () => {
  it("uses Egypt's 14% VAT and the 350 EGP FBA band", () => {
    expect(DEFAULT_FEE_SCHEDULE.vatRate).toBeCloseTo(0.14, 2);
    expect(DEFAULT_FEE_SCHEDULE.fbaPriceBandEgp).toBe(350);
  });
});
