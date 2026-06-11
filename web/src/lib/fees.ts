/**
 * Amazon Egypt fee schedule + deterministic profit/VAT engine.
 *
 * This is the platform's most trustworthy pillar (per docs/research/03): it is
 * pure math on a public, EG-specific fee schedule — NOT a statistical estimate.
 * The two correctness traps the audit calls out are handled explicitly here:
 *   1. 14% VAT is charged on Amazon's fees, AND the consumer price is
 *      VAT-inclusive (a VAT-registered seller's revenue = price / 1.14).
 *   2. Fee rates change — they live in a versioned, editable schedule with an
 *      `asOf` date, never as hard-coded magic numbers.
 *
 * ⚠️ The default rates below are researched best-effort values and MUST be
 * spot-confirmed against sell.amazon.eg/pricing before being relied upon.
 */

import type {
  CalculatorInput,
  CalculatorResult,
  FeeSchedule,
  ReferralRule,
} from "@/lib/types";
import { CATEGORY_BY_NODE } from "@/lib/constants";

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  asOf: "2026-06-08",
  vatRate: 0.14,
  fbaPriceBandEgp: 350,
  storageEgpPerCuFtMonth: 4,
  referral: [
    { category: "Electronics", categoryNode: "electronics", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.08 }] },
    {
      category: "Electronics Accessories",
      categoryNode: "electronics-accessories",
      minFeeEgp: 5,
      tiers: [
        { uptoEgp: 1000, rate: 0.15 },
        { uptoEgp: null, rate: 0.08 },
      ],
    },
    { category: "Beauty", categoryNode: "beauty", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.1 }] },
    { category: "Home & Kitchen", categoryNode: "home", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.12 }] },
    { category: "Office Products", categoryNode: "office-products", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.12 }] },
    { category: "Fashion", categoryNode: "fashion", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.12 }] },
    {
      category: "Grocery",
      categoryNode: "grocery",
      minFeeEgp: 3,
      tiers: [
        { uptoEgp: 250, rate: 0.04 },
        { uptoEgp: null, rate: 0.1 },
      ],
    },
    { category: "Toys & Games", categoryNode: "toys", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.12 }] },
    { category: "Baby", categoryNode: "baby", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.1 }] },
    { category: "Sports", categoryNode: "sports", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.12 }] },
    { category: "Automotive", categoryNode: "automotive", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.12 }] },
    { category: "Health & Household", categoryNode: "health", minFeeEgp: 5, tiers: [{ uptoEgp: null, rate: 0.1 }] },
    { category: "Books", categoryNode: "books", minFeeEgp: 3, tiers: [{ uptoEgp: null, rate: 0.12 }] },
  ],
  fbaLadder: [
    { sizeTier: "small-standard", label: "Small standard", maxWeightKg: 0.5, lowPriceFeeEgp: 15, highPriceFeeEgp: 22 },
    { sizeTier: "large-standard", label: "Large standard", maxWeightKg: 1, lowPriceFeeEgp: 22, highPriceFeeEgp: 30 },
    { sizeTier: "small-oversize", label: "Small oversize", maxWeightKg: 2, lowPriceFeeEgp: 38, highPriceFeeEgp: 52 },
    { sizeTier: "large-oversize", label: "Large oversize", maxWeightKg: 5, lowPriceFeeEgp: 75, highPriceFeeEgp: 100 },
  ],
  provenance: {
    source: "amazon_html_product:sell.amazon.eg/pricing",
    fetchedAt: "2026-06-08T00:00:00Z",
    isEstimated: true,
    confidence: "medium",
    note: "Researched defaults — spot-confirm against sell.amazon.eg/pricing (rates revised 2025 + 2026 promo).",
  },
};

const DEFAULT_REFERRAL_NODE = "home"; // generic ~12% fallback

export function getReferralRule(categoryNode: string, schedule = DEFAULT_FEE_SCHEDULE): ReferralRule {
  return (
    schedule.referral.find((r) => r.categoryNode === categoryNode) ??
    schedule.referral.find((r) => r.categoryNode === DEFAULT_REFERRAL_NODE)!
  );
}

/** Piecewise referral fee: each tier's rate applies to the price within its band. */
export function computeReferralFee(priceEgp: number, rule: ReferralRule): number {
  let fee = 0;
  let lower = 0;
  for (const tier of rule.tiers) {
    const upper = tier.uptoEgp ?? Infinity;
    if (priceEgp <= lower) break;
    const portion = Math.min(priceEgp, upper) - lower;
    fee += portion * tier.rate;
    lower = upper;
    if (priceEgp <= upper) break;
  }
  if (rule.minFeeEgp != null) fee = Math.max(fee, rule.minFeeEgp);
  return round2(fee);
}

export function computeFbaFee(
  priceEgp: number,
  sizeTier: string | undefined,
  schedule = DEFAULT_FEE_SCHEDULE,
): number {
  if (!sizeTier) return 0;
  const rung = schedule.fbaLadder.find((r) => r.sizeTier === sizeTier);
  if (!rung) return 0;
  return priceEgp > schedule.fbaPriceBandEgp ? rung.highPriceFeeEgp : rung.lowPriceFeeEgp;
}

/**
 * Full profit breakdown for one unit.
 *
 * VAT model (Egypt, 14%):
 *  - Consumer price is VAT-inclusive. A VAT-REGISTERED seller remits the output
 *    VAT, so net revenue = price / 1.14; they can also reclaim the input VAT
 *    Amazon charges on its fees.
 *  - A NON-registered seller keeps the full price but cannot reclaim the VAT
 *    charged on Amazon's fees, so that VAT becomes a real cost.
 */
export function computeProfit(
  input: CalculatorInput,
  schedule = DEFAULT_FEE_SCHEDULE,
): CalculatorResult {
  const { vatRate } = schedule;
  const price = Math.max(0, input.sellPriceEgp);
  const cogs = Math.max(0, input.costOfGoodsEgp);
  const inbound = Math.max(0, input.inboundShippingEgp ?? 0);
  const misc = Math.max(0, input.miscCostEgp ?? 0);

  const netRevenue = input.vatRegistered ? price / (1 + vatRate) : price;

  const rule = getReferralRule(input.categoryNode, schedule);
  const referralFee = computeReferralFee(price, rule);
  const fbaFee = input.fulfillment === "fba" ? computeFbaFee(price, input.fbaSizeTier, schedule) : 0;

  const referralVat = round2(referralFee * vatRate);
  const fbaVat = round2(fbaFee * vatRate);
  const reclaimableVat = input.vatRegistered ? round2(referralVat + fbaVat) : 0;
  // Net VAT cost on fees: 0 if registered (reclaimed), full if not.
  const feeVatCost = referralVat + fbaVat - reclaimableVat;

  const totalFees = round2(referralFee + fbaFee);
  const totalCost = round2(cogs + inbound + misc + totalFees + feeVatCost);
  const netProfit = round2(netRevenue - totalCost);

  const marginPct = price > 0 ? (netProfit / price) * 100 : 0;
  const investment = cogs + inbound + misc;
  const roiPct = investment > 0 ? (netProfit / investment) * 100 : 0;

  const warnings: string[] = [];
  if (schedule.provenance.isEstimated) {
    warnings.push("Fee rates are best-effort estimates — verify against sell.amazon.eg/pricing.");
  }
  if (netProfit < 0) warnings.push("This sells at a loss at the current price and cost.");
  if (!input.vatRegistered && price > 500000 / 12) {
    warnings.push("High volume may require VAT registration (EGP 500k/yr threshold).");
  }
  if (input.fulfillment === "fba" && !input.fbaSizeTier) {
    warnings.push("Select an FBA size tier to include fulfillment fees.");
  }

  return {
    sellPriceEgp: round2(price),
    netRevenueEgp: round2(netRevenue),
    referralFeeEgp: referralFee,
    referralVatEgp: referralVat,
    fbaFeeEgp: round2(fbaFee),
    fbaVatEgp: fbaVat,
    reclaimableVatEgp: reclaimableVat,
    costOfGoodsEgp: round2(cogs),
    inboundShippingEgp: round2(inbound),
    miscCostEgp: round2(misc),
    totalFeesEgp: totalFees,
    totalCostEgp: totalCost,
    netProfitEgp: netProfit,
    marginPct: round2(marginPct),
    roiPct: round2(roiPct),
    breakEvenPriceEgp: solveBreakEven(input, schedule),
    warnings,
  };
}

/**
 * Break-even sell price (netProfit = 0), solved numerically per MONOTONIC
 * segment. Within a segment profit is continuous and strictly increasing in
 * price (marginal net revenue ≥ 1/1.14 beats the max 15% marginal referral
 * rate), but the FBA fee JUMPS at `fbaPriceBandEgp` — so profit can cross zero
 * below the band, dip negative just above it, and cross again. A naive global
 * bisection may land on the SECOND crossing; we always return the FIRST
 * (lowest) break-even price.
 */
function solveBreakEven(input: CalculatorInput, schedule = DEFAULT_FEE_SCHEDULE): number {
  const profitAt = (price: number) =>
    computeProfitCore({ ...input, sellPriceEgp: price }, schedule);

  const bisect = (lo: number, hi: number): number => {
    // invariant: profitAt(lo) < 0 <= profitAt(hi), profit monotonic on [lo, hi]
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (profitAt(mid) >= 0) hi = mid;
      else lo = mid;
    }
    return round2(hi);
  };

  // Segment 1: [0, band] — only exists when the FBA fee step applies.
  const stepAt =
    input.fulfillment === "fba" && input.fbaSizeTier ? schedule.fbaPriceBandEgp : null;
  if (stepAt != null && profitAt(stepAt) >= 0) {
    return profitAt(0) >= 0 ? 0 : bisect(0, stepAt);
  }

  // Segment 2 (or the whole domain when there is no step).
  const lo = stepAt ?? 0;
  let hi = Math.max(lo + 100, (input.costOfGoodsEgp + (input.inboundShippingEgp ?? 0)) * 6 + 1000);
  // Expand hi until profit turns positive (guards pathological fee configs).
  for (let i = 0; i < 40 && profitAt(hi) < 0; i++) hi *= 1.6;
  if (profitAt(hi) < 0) return NaN;
  return bisect(lo, hi);
}

/** Lightweight net-profit-only core used by the break-even solver (no warnings). */
function computeProfitCore(input: CalculatorInput, schedule: FeeSchedule): number {
  const { vatRate } = schedule;
  const price = Math.max(0, input.sellPriceEgp);
  const netRevenue = input.vatRegistered ? price / (1 + vatRate) : price;
  const rule = getReferralRule(input.categoryNode, schedule);
  const referralFee = computeReferralFee(price, rule);
  const fbaFee = input.fulfillment === "fba" ? computeFbaFee(price, input.fbaSizeTier, schedule) : 0;
  const feeVat = input.vatRegistered ? 0 : (referralFee + fbaFee) * vatRate;
  const totalCost =
    (input.costOfGoodsEgp ?? 0) +
    (input.inboundShippingEgp ?? 0) +
    (input.miscCostEgp ?? 0) +
    referralFee +
    fbaFee +
    feeVat;
  return netRevenue - totalCost;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
