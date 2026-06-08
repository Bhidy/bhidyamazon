/**
 * Winning Product Score (WPS) — the Opportunity Finder's scoring engine.
 *
 * Scores a product against the 12-point sourcing filter:
 *   small + cheap + non-breakable + low return + clear need + weak competition
 *   + enough demand  (+ right category, right material, easy sourcing, bundle).
 *
 * Design mirrors `fees.ts`: a versioned config object (`WINNING_SCORE_CONFIG`,
 * with `asOf` + `provenance`) and a PURE function (`computeWinningScore`) that
 * takes the config + user overrides as parameters so it is fully deterministic
 * and unit-testable. No clocks, no I/O, no randomness.
 *
 * Honesty discipline (the institutional control):
 *  - A missing input ⇒ the criterion is `available: false` and is EXCLUDED from
 *    the composite — never scored as zero.
 *  - The composite is renormalized over AVAILABLE weights only (so a product we
 *    only partly know is not silently deflated).
 *  - `completeness` is the weight-share of evaluated criteria; below the gate, or
 *    when a required criterion is missing, the verdict is `insufficient-data`.
 *  - Soft/modeled criteria are pinned to `signal: "estimate"` / low confidence;
 *    the composite inherits the WORST available tier. Only a scraped fact or a
 *    user override ever reaches high confidence.
 */

import type {
  Confidence,
  CriterionConfig,
  CriterionKey,
  CriterionBand,
  CriterionOverride,
  CriterionScore,
  Product,
  WinningScore,
  WinningScoreConfig,
  WpsConfidence,
  WpsOverrides,
  WpsVerdict,
} from "@/lib/types";

/* ───────────────────────────── reference data ───────────────────────────── */

/** App category nodes that ARE the car-accessory niche. */
export const CAR_CATEGORY_NODES = ["automotive"];

/** Keywords that mark a listing as car-adjacent even outside the automotive node. */
export const CAR_KEYWORDS = [
  "car", "auto", "vehicle", "truck", "motor", "dashboard", "windshield",
  "windscreen", "steering", "trunk", "seat belt", "headrest", "tyre", "tire",
];

/** Preferred, non-electronic, durable materials (criterion 4). */
const GOOD_MATERIALS = [
  "plastic", "silicone", "rubber", "fabric", "nylon", "tpu", "leather",
  "cloth", "textile", "polyester", "foam", "microfiber", "micro fiber",
  "mixed materials", "pvc", "abs", "neoprene", "felt", "canvas",
];

/** Signals that an item is electronic (NOT what this niche wants). */
const ELECTRONIC_KEYWORDS = [
  "battery", "wireless", "charger", "charging", "electric", "electronic", "led",
  "usb", "bluetooth", "rechargeable", "watt", "volt", "adapter", "sensor",
  "camera", "dvr", "gps", "powered", "lithium", "screen", "display",
];

const FRAGILE_RE = /\b(glass|ceramic|porcelain|crystal)\b/i;
const METAL_RE = /\b(metal|steel|alumin|aluminium|aluminum|iron|brass|zinc|chrome)\b/i;

/** Break/return review-complaint context is precomputed in real-store; the engine
 *  reads the counts off the Product. These regexes are exported so the data layer
 *  mines the same tokens the engine reasons about. */
export const BREAK_TOKENS = [
  "broke", "broken", "break", "cracked", "crack", "snapped", "snap", "shatter",
  "fell apart", "flimsy", "انكسر", "مكسور", "تكسر", "هش",
];
export const FIT_TOKENS = [
  "doesn't fit", "does not fit", "didn't fit", "too small", "too big", "wrong size",
  "not fit", "wrong", "returned", "return", "مقاس", "لا يناسب", "مش مظبوط", "غير مناسب", "ارجاع",
];

/** Detect a listing whose value depends on an exact car model/year (return risk). */
const CAR_MODEL_RE =
  /\b(fits?|for|compatible(?:\swith)?)\b[^.]{0,45}\b(toyota|honda|hyundai|kia|nissan|bmw|mercedes|benz|chevrolet|chevy|ford|mitsubishi|mazda|peugeot|renault|skoda|volkswagen|vw|audi|opel|fiat|jeep|suzuki|geely|mg|corolla|civic|elantra|accent|sunny|sentra|tucson|sportage|cerato|lancer|octavia|passat|golf|tiggo|verna)\b/i;
const FIT_YEAR_RE = /\b(fits?|for)\b[^.]{0,30}\b(19|20)\d{2}\b/i;

/* ─────────────────────────── the car preset config ──────────────────────── */

export const WINNING_SCORE_CONFIG: WinningScoreConfig = {
  version: "wps-2026-06-09",
  asOf: "2026-06-09",
  presetId: "car-micro-utility",
  presetLabelEn: "Car micro-utility accessory",
  presetLabelAr: "إكسسوار سيارة صغير متعدد الاستخدام",
  criteria: [
    { key: "category", weight: 12, signal: "fact", labelEn: "Car-accessory category", labelAr: "فئة إكسسوارات السيارة" },
    { key: "size", weight: 10, signal: "fact", labelEn: "Very small", labelAr: "صغير جدًا", thresholds: { smallCm: 15, largeCm: 40 } },
    { key: "weight", weight: 8, signal: "fact", labelEn: "Very light", labelAr: "خفيف جدًا", thresholds: { lightKg: 0.15, heavyKg: 1.0 } },
    { key: "material", weight: 8, signal: "estimate", labelEn: "Non-electronic & durable", labelAr: "خامة غير إلكترونية ومتينة" },
    { key: "breakRisk", weight: 7, signal: "estimate", labelEn: "Low break risk", labelAr: "خطر كسر منخفض" },
    { key: "returnRisk", weight: 9, signal: "estimate", labelEn: "Low return risk", labelAr: "خطر إرجاع منخفض" },
    { key: "price", weight: 10, signal: "fact", labelEn: "Low–medium price", labelAr: "سعر منخفض-متوسط", thresholds: { lowEgp: 40, midEgp: 400, highEgp: 1500 } },
    { key: "useCaseClarity", weight: 6, signal: "estimate", labelEn: "Clear use-case", labelAr: "استخدام واضح", thresholds: { maxTitleWords: 18 } },
    { key: "competition", weight: 12, signal: "ordinal", labelEn: "Weak competition", labelAr: "منافسة ضعيفة" },
    { key: "demand", weight: 10, signal: "ordinal", labelEn: "Enough demand", labelAr: "طلب كافٍ" },
    { key: "sourcing", weight: 4, signal: "estimate", labelEn: "Easy sourcing", labelAr: "توريد سهل" },
    { key: "bundle", weight: 4, signal: "estimate", labelEn: "Bundle potential", labelAr: "إمكانية التجميع" },
  ],
  verdictBands: { winner: 75, promising: 60, marginal: 45 },
  minCompleteness: 0.6,
  // Without the category, the price, AND the size we genuinely cannot judge a
  // "small, cheap car item" — so we defer to manual review rather than guess.
  // (Any of these is user-overridable, which un-gates the candidate.)
  requiredCriteria: ["category", "price", "size"],
  provenance: {
    source: "wps-config:car-micro-utility",
    fetchedAt: "2026-06-09T00:00:00Z",
    isEstimated: true,
    confidence: "medium",
    note: "Preset weights are a researched starting point — calibrate against real outcomes. Soft criteria are low-confidence and user-overridable.",
  },
};

/* ─────────────────────────── peer-context input ─────────────────────────── */

/** Niche-relative inputs that a single Product can't supply (competition/demand).
 *  Built once per niche in the data layer and passed in, keeping scorers pure. */
export interface ScoreContext {
  /** Review counts of all peers in the same niche. */
  peerReviewCounts: number[];
  /** brand → count in the niche, for concentration (HHI). */
  peerBrandCounts: Record<string, number>;
  /** Number of listings in the niche (saturation). */
  peerCount: number;
  /** Image counts of enriched peers, for listing-quality gap (optional). */
  peerImageCounts: number[];
}

export const EMPTY_CONTEXT: ScoreContext = {
  peerReviewCounts: [],
  peerBrandCounts: {},
  peerCount: 0,
  peerImageCounts: [],
};

/* ──────────────────────────── numeric helpers ───────────────────────────── */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function clamp(lo: number, hi: number, n: number): number {
  return Math.max(lo, Math.min(hi, n));
}
/** x ≤ full → 100, x ≥ zero → 0, linear between. */
function decay(x: number, full: number, zero: number): number {
  if (x <= full) return 100;
  if (x >= zero) return 0;
  return (100 * (zero - x)) / (zero - full);
}
function bandFromScore(s: number): CriterionBand {
  if (s >= 70) return "strong";
  if (s >= 45) return "moderate";
  return "weak";
}
function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function hhi(counts: Record<string, number>): number {
  const vals = Object.values(counts);
  const tot = vals.reduce((a, b) => a + b, 0);
  if (!tot) return 0;
  return vals.reduce((s, v) => s + (v / tot) ** 2, 0);
}
/** Fraction of arr ≤ value (0–1). */
function percentile(value: number, arr: number[]): number {
  if (!arr.length) return 0;
  return arr.filter((x) => x <= value).length / arr.length;
}

/** Build a CriterionScore. `subscore == null` ⇒ unavailable (excluded from composite). */
function mk(
  key: CriterionKey,
  subscore: number | null,
  signal: CriterionScore["signal"],
  confidence: WpsConfidence,
  reason: string,
): CriterionScore {
  if (subscore == null) {
    return { key, subscore: null, band: "unknown", confidence, signal, available: false, overridden: false, reason, effectiveWeight: 0 };
  }
  const s = clamp(0, 100, round2(subscore));
  return { key, subscore: s, band: bandFromScore(s), confidence, signal, available: true, overridden: false, reason, effectiveWeight: 0 };
}

function hasAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/* ─────────────────────────── per-criterion scorers ──────────────────────── */

function scoreCategory(p: Product): CriterionScore {
  if (CAR_CATEGORY_NODES.includes(p.categoryNode)) {
    return mk("category", 100, "fact", "high", "Listed in the Automotive category on amazon.eg.");
  }
  const hay = `${p.titleEn ?? ""} ${p.bsrLeafCategory ?? ""}`;
  if (hasAny(hay, CAR_KEYWORDS)) {
    return mk("category", 60, "ordinal", "medium", "Car-adjacent (vehicle keyword in the listing), but not in the Automotive node.");
  }
  return mk("category", 5, "fact", "high", `Not a car-accessory category (in "${p.categoryName ?? p.categoryNode}").`);
}

function scoreSize(p: Product, cfg: CriterionConfig): CriterionScore {
  const t = cfg.thresholds ?? {};
  const smallCm = t.smallCm ?? 15;
  const largeCm = t.largeCm ?? 40;
  const d = p.itemDimensionsCm;
  if (!d) return mk("size", null, "fact", "low", "No item dimensions on the listing — enrich or set manually.");
  const longest = Math.max(d.l, d.w, d.h);
  if (longest <= 0) return mk("size", null, "fact", "low", "Item dimensions present but unusable.");
  const s = decay(longest, smallCm, largeCm);
  return mk("size", s, "fact", "high", `Longest edge ${round2(longest)} cm (≤${smallCm} = very small, ≥${largeCm} = bulky).`);
}

function scoreWeight(p: Product, cfg: CriterionConfig): CriterionScore {
  const t = cfg.thresholds ?? {};
  const lightKg = t.lightKg ?? 0.15;
  const heavyKg = t.heavyKg ?? 1.0;
  const w = p.itemWeightKg;
  if (w == null) return mk("weight", null, "fact", "low", "No item weight on the listing — enrich or set manually.");
  const s = decay(w, lightKg, heavyKg);
  const disp = w < 0.001 ? "<1 g" : w < 1 ? `${Math.round(w * 1000)} g` : `${round2(w)} kg`;
  return mk("weight", s, "fact", "high", `${disp} (light ≤ ${lightKg} kg, heavy ≥ ${heavyKg} kg).`);
}

function scoreMaterial(p: Product): CriterionScore {
  const elec = hasAny(`${p.titleEn ?? ""} ${p.material ?? ""}`, ELECTRONIC_KEYWORDS);
  if (p.material) {
    const ml = p.material.toLowerCase();
    let base: number;
    let conf: WpsConfidence = "medium";
    let signal: CriterionScore["signal"] = "fact";
    let why: string;
    if (hasAny(ml, GOOD_MATERIALS)) {
      base = 100;
      why = `Material "${p.material}" is non-electronic and durable.`;
    } else if (FRAGILE_RE.test(ml)) {
      base = 15;
      why = `Material "${p.material}" is fragile (glass/ceramic) — high break risk.`;
    } else if (METAL_RE.test(ml)) {
      base = 45;
      why = `Material "${p.material}" is durable but heavier than plastic/silicone/fabric.`;
    } else {
      base = 55;
      conf = "low";
      signal = "estimate";
      why = `Material "${p.material}" is unclassified — treat as an estimate.`;
    }
    if (elec) {
      base = Math.min(base, 25);
      signal = "estimate";
      conf = "low";
      why = `Electronic indicators in the listing — not a simple non-electronic item.`;
    }
    return mk("material", base, signal, conf, why);
  }
  // No material attribute → infer from the title only (low confidence).
  if (elec) return mk("material", 20, "estimate", "low", "Title suggests an electronic item (not preferred); no material spec.");
  if (hasAny(p.titleEn ?? "", GOOD_MATERIALS)) return mk("material", 70, "estimate", "low", "Title hints a non-electronic material; no spec confirmed.");
  return mk("material", null, "estimate", "low", "No material attribute and no material hint in the title.");
}

function scoreBreakRisk(p: Product): CriterionScore {
  // Base durability from material, then penalize per review break-complaint rate.
  let base: number;
  const ml = (p.material ?? "").toLowerCase();
  if (FRAGILE_RE.test(ml)) base = 20;
  else if (hasAny(ml, GOOD_MATERIALS)) base = 85;
  else if (METAL_RE.test(ml)) base = 75;
  else base = 60; // unknown material → neutral baseline
  const n = p.reviewSampleSize ?? 0;
  const c = p.breakComplaintCount ?? 0;
  let penalty = 0;
  if (n > 0 && c > 0) penalty = clamp(0, 60, (c / n) * 100 * 1.5);
  const s = clamp(0, 100, base - penalty);
  const reason =
    n > 0
      ? `${c} break complaint${c === 1 ? "" : "s"} in ${n} reviews; material durability factored. Higher = safer.`
      : `Estimated from material durability (no review sample yet). Higher = safer.`;
  return mk("breakRisk", s, "estimate", "low", reason);
}

function scoreReturnRisk(p: Product): CriterionScore {
  // Higher subscore = lower return risk.
  let base = p.rating != null ? clamp(0, 100, ((p.rating - 2.5) / 2.5) * 100) : 50;
  const title = p.titleEn ?? "";
  const fitDependent = CAR_MODEL_RE.test(title) || FIT_YEAR_RE.test(title);
  const reasons: string[] = [];
  reasons.push(p.rating != null ? `rating ${p.rating}★` : "no rating");
  if (fitDependent) {
    base -= 40;
    reasons.push("model/year-specific fit (return-prone)");
  } else {
    reasons.push("not model-fit-dependent");
  }
  const n = p.reviewSampleSize ?? 0;
  const f = p.fitComplaintCount ?? 0;
  if (n > 0 && f > 0) {
    base -= clamp(0, 30, (f / n) * 100);
    reasons.push(`${f} fit/return complaint${f === 1 ? "" : "s"} in ${n} reviews`);
  }
  return mk("returnRisk", clamp(0, 100, base), "estimate", "low", `${reasons.join("; ")}. Higher = safer.`);
}

function scorePrice(p: Product, cfg: CriterionConfig): CriterionScore {
  const t = cfg.thresholds ?? {};
  const lowEgp = t.lowEgp ?? 40;
  const midEgp = t.midEgp ?? 400;
  const highEgp = t.highEgp ?? 1500;
  const price = p.priceEgp;
  if (price == null) return mk("price", null, "fact", "low", "No price on the listing.");
  let s: number;
  if (price >= lowEgp && price <= midEgp) s = 100;
  else if (price < lowEgp) s = 70 + (30 * price) / lowEgp; // cheap is fine; only the thinnest margin dips
  else s = decay(price, midEgp, highEgp); // expensive inventory is the problem
  return mk("price", s, "fact", "high", `EGP ${round2(price)} (ideal ${lowEgp}–${midEgp}; expensive above ${highEgp}).`);
}

function scoreUseCase(p: Product, cfg: CriterionConfig): CriterionScore {
  const t = cfg.thresholds ?? {};
  const maxWords = t.maxTitleWords ?? 18;
  const title = (p.titleEn ?? "").trim();
  if (!title) return mk("useCaseClarity", null, "estimate", "low", "No title to assess clarity.");
  const words = title.split(/\s+/).length;
  let base: number;
  if (words <= 2) base = 45;
  else if (words <= 8) base = 90;
  else if (words <= maxWords) base = 70;
  else base = 45; // keyword-stuffed
  const bits: string[] = [`${words}-word title`];
  if (p.imageCount != null) {
    if (p.imageCount >= 3) {
      base += 8;
      bits.push(`${p.imageCount} images`);
    } else {
      base -= 10;
      bits.push(`only ${p.imageCount} image${p.imageCount === 1 ? "" : "s"}`);
    }
  }
  if (p.featureBulletCount != null && p.featureBulletCount >= 3) base += 4;
  return mk("useCaseClarity", clamp(0, 100, base), "estimate", "low", `${bits.join(", ")} — clarity heuristic.`);
}

function scoreCompetition(p: Product, ctx: ScoreContext): CriterionScore {
  // Weak competition (fragmented, low-review, weak listings) → HIGH subscore.
  const parts: number[] = [];
  const why: string[] = [];
  if (ctx.peerReviewCounts.length) {
    const med = median(ctx.peerReviewCounts);
    // log-scaled: median 10→~100 (weak), 10k→0 (entrenched)
    const a = clamp(0, 100, 100 - ((Math.log10(med + 1) - 1) / 3) * 100);
    parts.push(a);
    why.push(`niche median ${Math.round(med)} reviews`);
  }
  const brandCount = Object.keys(ctx.peerBrandCounts).length;
  if (brandCount > 0) {
    const h = hhi(ctx.peerBrandCounts);
    const b = clamp(0, 100, (1 - h) * 100);
    parts.push(b);
    why.push(`${brandCount} brands (HHI ${round2(h)})`);
  }
  if (ctx.peerImageCounts.length) {
    const avgImg = mean(ctx.peerImageCounts);
    const c = decay(avgImg, 3, 8); // weak photos (few images) → opportunity
    parts.push(c);
    why.push(`avg ${round2(avgImg)} photos/listing`);
  }
  if (!parts.length) return mk("competition", null, "ordinal", "low", "No niche peer data to gauge competition.");
  const s = mean(parts);
  return mk("competition", s, "ordinal", "medium", `${why.join(", ")}. Higher = weaker competition.`);
}

function scoreDemand(p: Product, ctx: ScoreContext): CriterionScore {
  // Within-niche review-count percentile = an ordinal "proven demand" proxy.
  // We do NOT fabricate a market-saturation number from our own sample size; the
  // "not overcrowded" half of this criterion is carried by the Weak-competition
  // score (incumbent strength + brand fragmentation), which IS measurable.
  if (!ctx.peerReviewCounts.length || p.reviewCount == null) {
    return mk("demand", null, "ordinal", "low", "No within-niche demand signal (review counts).");
  }
  const pct = percentile(p.reviewCount, ctx.peerReviewCounts) * 100;
  return mk(
    "demand",
    pct,
    "ordinal",
    "medium",
    `Review-count percentile ${Math.round(pct)} within the niche — a proven-demand proxy (overcrowding is judged by Weak competition).`,
  );
}

function scoreSourcing(p: Product): CriterionScore {
  // No marketplace sourcing signal exists. Weak auto-hint only; the real answer is
  // the manual AliExpress/1688 check (deep-linked in the UI). Prime override target.
  const brand = (p.brand ?? "").trim();
  const generic = !brand || brand.length <= 2 || /generic|unbranded|no name|oem/i.test(brand);
  const s = generic ? 60 : 45;
  const hint = generic ? "likely white-label (easier to source)" : `branded "${brand}" (verify a generic equivalent)`;
  return mk("sourcing", s, "estimate", "low", `${hint}. No marketplace sourcing data — confirm on AliExpress/1688.`);
}

function scoreBundle(p: Product): CriterionScore {
  const n = p.numberOfItems ?? 1;
  let base = n > 1 ? 80 : 55;
  if (CAR_CATEGORY_NODES.includes(p.categoryNode)) base += 10;
  const reason =
    n > 1
      ? `Already a ${n}-piece set; pairs well with related car items.`
      : `Single item; small car accessories bundle naturally with related products.`;
  return mk("bundle", clamp(0, 100, base), "estimate", "low", reason);
}

type Scorer = (p: Product, cfg: CriterionConfig, ctx: ScoreContext) => CriterionScore;

const SCORERS: Record<CriterionKey, Scorer> = {
  category: (p) => scoreCategory(p),
  size: (p, cfg) => scoreSize(p, cfg),
  weight: (p, cfg) => scoreWeight(p, cfg),
  material: (p) => scoreMaterial(p),
  breakRisk: (p) => scoreBreakRisk(p),
  returnRisk: (p) => scoreReturnRisk(p),
  price: (p, cfg) => scorePrice(p, cfg),
  useCaseClarity: (p, cfg) => scoreUseCase(p, cfg),
  competition: (p, _cfg, ctx) => scoreCompetition(p, ctx),
  demand: (p, _cfg, ctx) => scoreDemand(p, ctx),
  sourcing: (p) => scoreSourcing(p),
  bundle: (p) => scoreBundle(p),
};

/* ───────────────────────────── override merge ───────────────────────────── */

/** Merge a user override/confirmation into an auto score (pure). */
export function applyOverride(auto: CriterionScore, ov?: CriterionOverride): CriterionScore {
  if (!ov) return auto;
  if (ov.subscore != null) {
    const s = clamp(0, 100, round2(ov.subscore));
    return {
      ...auto,
      subscore: s,
      band: bandFromScore(s),
      available: true,
      overridden: true,
      confidence: "user-confirmed",
      signal: "fact",
      reason: ov.note ? `${ov.note} (user-set to ${s}).` : `User-set to ${s}.`,
    };
  }
  if (ov.confirm) {
    // Confirm-only: keep the auto value, just raise trust. Can't confirm a null.
    if (auto.subscore == null) return { ...auto, reason: `${auto.reason} (cannot confirm — no value).` };
    return {
      ...auto,
      overridden: true,
      confidence: "user-confirmed",
      reason: `${auto.reason} (user-confirmed${ov.note ? `: ${ov.note}` : ""}).`,
    };
  }
  return auto;
}

/* ──────────────────────────────── composite ─────────────────────────────── */

const TIER_RANK: Record<WpsConfidence, number> = { "user-confirmed": 3, high: 2, medium: 1, low: 0 };

export function computeWinningScore(
  product: Product,
  overrides: WpsOverrides = {},
  config: WinningScoreConfig = WINNING_SCORE_CONFIG,
  ctx: ScoreContext = EMPTY_CONTEXT,
): WinningScore {
  const ov = overrides[product.asin] ?? {};
  const weightOf = (k: CriterionKey) => config.criteria.find((c) => c.key === k)?.weight ?? 0;

  // 1. Score every criterion (in config order → deterministic), then merge overrides.
  const criteria: CriterionScore[] = config.criteria.map((cfg) => applyOverride(SCORERS[cfg.key](product, cfg, ctx), ov[cfg.key]));

  // 2. Renormalize weights over AVAILABLE criteria only.
  const totalWeight = config.criteria.reduce((s, c) => s + c.weight, 0);
  const availWeight = criteria.filter((s) => s.available).reduce((sum, s) => sum + weightOf(s.key), 0);
  for (const s of criteria) s.effectiveWeight = s.available && availWeight > 0 ? round2(weightOf(s.key) / availWeight) : 0;

  // 3. Composite = weighted mean over available subscores (never deflated by missing ones).
  let score: number | null = null;
  if (availWeight > 0) {
    const raw = criteria.filter((s) => s.available).reduce((sum, s) => sum + s.subscore! * weightOf(s.key), 0) / availWeight;
    score = round2(raw);
  }

  // 4. Completeness = weight-share of evaluated criteria (NOT count-share).
  const completeness = round2(availWeight / totalWeight);

  // 5. Confidence coverage = trusted weight-share among AVAILABLE criteria.
  const trustedWeight = criteria
    .filter((s) => s.available && (s.confidence === "high" || s.confidence === "user-confirmed"))
    .reduce((sum, s) => sum + weightOf(s.key), 0);
  const confidenceCoverage = availWeight > 0 ? round2(trustedWeight / availWeight) : 0;

  // 6. Gate.
  const missingRequired = config.requiredCriteria.filter((k) => !criteria.find((s) => s.key === k)?.available);
  const gated = score === null || completeness < config.minCompleteness || missingRequired.length > 0;

  // 7. Verdict.
  let verdict: WpsVerdict;
  if (gated) verdict = "insufficient-data";
  else if (score! >= config.verdictBands.winner) verdict = "winner";
  else if (score! >= config.verdictBands.promising) verdict = "promising";
  else if (score! >= config.verdictBands.marginal) verdict = "marginal";
  else verdict = "avoid";

  // 8. Provenance — composite inherits the WORST available tier; estimated unless all-fact/confirmed.
  const availTiers = criteria.filter((s) => s.available).map((s) => s.confidence);
  const worst = availTiers.length ? availTiers.reduce((w, c) => (TIER_RANK[c] < TIER_RANK[w] ? c : w), availTiers[0]) : "low";
  const compConfidence: Confidence = worst === "user-confirmed" || worst === "high" ? "high" : worst === "medium" ? "medium" : "low";
  const isEstimated = criteria.some((s) => s.available && s.signal === "estimate" && s.confidence !== "user-confirmed");

  const note = gated
    ? `Insufficient data (${Math.round(completeness * 100)}% complete${missingRequired.length ? `, missing ${missingRequired.join("/")}` : ""}) — manual review.`
    : `Weighted across ${criteria.filter((s) => s.available).length} of ${config.criteria.length} criteria.`;

  return {
    asin: product.asin,
    score,
    verdict,
    completeness,
    confidenceCoverage,
    criteria,
    gated,
    presetId: config.presetId,
    configVersion: config.version,
    provenance: { source: "wps-engine", fetchedAt: product.provenance?.fetchedAt ?? config.asOf, isEstimated, confidence: compConfidence, note },
  };
}
