/**
 * Deterministic seed dataset for amazon.eg.
 *
 * Realistic sample data so every screen works before the live scrapers are
 * wired in. Everything is generated from a seeded PRNG + fixed base date so
 * server and client renders match (no hydration drift) and so the live data
 * adapters are a pure drop-in replacement behind src/lib/data.ts.
 */

import type { Locale } from "@/lib/types";

/** Fixed reference date for the dataset (keeps time-series deterministic). */
export const SEED_NOW = Date.UTC(2026, 5, 8); // 2026-06-08
export const SEED_DAYS = 90;

/* ----------------------------- seeded PRNG ------------------------------- */

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small deterministic PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedProduct {
  asin: string;
  titleEn: string;
  titleAr: string;
  brand: string;
  categoryNode: string;
  priceEgp: number;
  rating: number;
  reviewCount: number;
  /** Baseline BSR within the category (the time-series oscillates around it). */
  bsr: number;
  fbaSizeTier: string;
}

export const PRODUCTS: SeedProduct[] = [
  { asin: "B0EG0ANKR1", titleEn: "Anker 65W USB-C GaN Fast Charger", titleAr: "شاحن أنكر سريع 65 واط USB-C", brand: "Anker", categoryNode: "electronics-accessories", priceEgp: 899, rating: 4.6, reviewCount: 2143, bsr: 3, fbaSizeTier: "small-standard" },
  { asin: "B0EG0XIAM2", titleEn: "Redmi Buds 5 Wireless Earbuds", titleAr: "سماعات ريدمي بدز 5 لاسلكية", brand: "Xiaomi", categoryNode: "electronics-accessories", priceEgp: 1299, rating: 4.3, reviewCount: 5210, bsr: 1, fbaSizeTier: "small-standard" },
  { asin: "B0EG0ORAI3", titleEn: "Oraimo 20000mAh Power Bank 22.5W", titleAr: "باور بانك أوريمو 20000 مللي أمبير", brand: "Oraimo", categoryNode: "electronics-accessories", priceEgp: 749, rating: 4.4, reviewCount: 8932, bsr: 2, fbaSizeTier: "small-standard" },
  { asin: "B0EG0SAMS4", titleEn: "Samsung 25W Super Fast Charger", titleAr: "شاحن سامسونج الفائق 25 واط", brand: "Samsung", categoryNode: "electronics-accessories", priceEgp: 520, rating: 4.5, reviewCount: 3320, bsr: 5, fbaSizeTier: "small-standard" },
  { asin: "B0EG0LOGI5", titleEn: "Logitech M171 Wireless Mouse", titleAr: "ماوس لوجيتك M171 لاسلكي", brand: "Logitech", categoryNode: "electronics-accessories", priceEgp: 480, rating: 4.6, reviewCount: 6110, bsr: 4, fbaSizeTier: "small-standard" },
  { asin: "B0EG0PHIL6", titleEn: "Philips Airfryer 4.1L HD9252", titleAr: "قلاية فيليبس الهوائية 4.1 لتر", brand: "Philips", categoryNode: "home", priceEgp: 6499, rating: 4.7, reviewCount: 1840, bsr: 1, fbaSizeTier: "large-oversize" },
  { asin: "B0EG0TORN7", titleEn: "Tornado Electric Kettle 1.7L", titleAr: "غلاية تورنيدو الكهربائية 1.7 لتر", brand: "Tornado", categoryNode: "home", priceEgp: 1150, rating: 4.4, reviewCount: 2670, bsr: 2, fbaSizeTier: "large-standard" },
  { asin: "B0EG0BRAU8", titleEn: "Braun Series 3 Electric Shaver", titleAr: "ماكينة حلاقة براون سيريس 3", brand: "Braun", categoryNode: "health", priceEgp: 3499, rating: 4.5, reviewCount: 990, bsr: 3, fbaSizeTier: "small-standard" },
  { asin: "B0EG0LORE9", titleEn: "L'Oréal Revitalift Hyaluronic Serum", titleAr: "سيروم لوريال ريفيتاليفت هيالورونيك", brand: "L'Oréal", categoryNode: "beauty", priceEgp: 459, rating: 4.4, reviewCount: 4521, bsr: 1, fbaSizeTier: "small-standard" },
  { asin: "B0EG0MAYB10", titleEn: "Maybelline Lash Sensational Mascara", titleAr: "ماسكارا مايبيلين لاش سينسيشنال", brand: "Maybelline", categoryNode: "beauty", priceEgp: 289, rating: 4.3, reviewCount: 7044, bsr: 2, fbaSizeTier: "small-standard" },
  { asin: "B0EG0NIVE11", titleEn: "NIVEA Men Dark Spot Face Cream", titleAr: "كريم نيفيا مزيل البقع للرجال", brand: "NIVEA", categoryNode: "beauty", priceEgp: 179, rating: 4.2, reviewCount: 3380, bsr: 4, fbaSizeTier: "small-standard" },
  { asin: "B0EG0SONY12", titleEn: "Sony WH-CH520 Wireless Headphones", titleAr: "سماعة سوني WH-CH520 لاسلكية", brand: "Sony", categoryNode: "electronics", priceEgp: 2999, rating: 4.6, reviewCount: 2210, bsr: 2, fbaSizeTier: "large-standard" },
  { asin: "B0EG0JBL013", titleEn: "JBL Go 4 Portable Bluetooth Speaker", titleAr: "مكبر صوت جي بي إل جو 4 محمول", brand: "JBL", categoryNode: "electronics", priceEgp: 2499, rating: 4.7, reviewCount: 3990, bsr: 1, fbaSizeTier: "small-standard" },
  { asin: "B0EG0MOLF14", titleEn: "Molfix Baby Diapers Size 4 (Jumbo)", titleAr: "حفاضات مولفيكس مقاس 4 جامبو", brand: "Molfix", categoryNode: "baby", priceEgp: 329, rating: 4.5, reviewCount: 12050, bsr: 1, fbaSizeTier: "large-standard" },
  { asin: "B0EG0FABE15", titleEn: "Faber-Castell Colour Pencils 24pc", titleAr: "أقلام فابر كاستل الخشبية 24 لون", brand: "Faber-Castell", categoryNode: "office-products", priceEgp: 145, rating: 4.8, reviewCount: 5530, bsr: 1, fbaSizeTier: "small-standard" },
  { asin: "B0EG0INDO16", titleEn: "Indomie Instant Noodles (40 Pack)", titleAr: "إندومي نودلز سريعة التحضير 40 كيس", brand: "Indomie", categoryNode: "grocery", priceEgp: 215, rating: 4.7, reviewCount: 9870, bsr: 1, fbaSizeTier: "large-standard" },
  { asin: "B0EG0ADID17", titleEn: "Adidas Classic Backpack", titleAr: "حقيبة ظهر أديداس كلاسيك", brand: "Adidas", categoryNode: "fashion", priceEgp: 1199, rating: 4.5, reviewCount: 1620, bsr: 3, fbaSizeTier: "large-standard" },
  { asin: "B0EG0DETT18", titleEn: "Dettol Antibacterial Handwash 1L", titleAr: "غسول ديتول المضاد للبكتيريا 1 لتر", brand: "Dettol", categoryNode: "health", priceEgp: 89, rating: 4.6, reviewCount: 6240, bsr: 1, fbaSizeTier: "large-standard" },
];

export const PRODUCT_BY_ASIN: Record<string, SeedProduct> = Object.fromEntries(
  PRODUCTS.map((p) => [p.asin, p]),
);

export interface SeedKeyword {
  query: string;
  lang: Locale;
  baseScore: number; // 0–100 relative demand
  trendBias: number; // -1..1 (negative = falling)
}

export const KEYWORDS: SeedKeyword[] = [
  { query: "wireless earbuds", lang: "en", baseScore: 94, trendBias: 0.6 },
  { query: "سماعات بلوتوث", lang: "ar", baseScore: 91, trendBias: 0.5 },
  { query: "power bank", lang: "en", baseScore: 88, trendBias: 0.2 },
  { query: "شاحن سريع", lang: "ar", baseScore: 85, trendBias: 0.7 },
  { query: "air fryer", lang: "en", baseScore: 83, trendBias: 0.8 },
  { query: "قلاية هوائية", lang: "ar", baseScore: 80, trendBias: 0.9 },
  { query: "usb c cable", lang: "en", baseScore: 78, trendBias: -0.1 },
  { query: "كريم تفتيح", lang: "ar", baseScore: 74, trendBias: 0.3 },
  { query: "baby diapers", lang: "en", baseScore: 72, trendBias: 0.0 },
  { query: "حفاضات اطفال", lang: "ar", baseScore: 70, trendBias: 0.1 },
  { query: "bluetooth speaker", lang: "en", baseScore: 68, trendBias: 0.4 },
  { query: "ماوس لاسلكي", lang: "ar", baseScore: 64, trendBias: -0.2 },
  { query: "face serum", lang: "en", baseScore: 61, trendBias: 0.5 },
  { query: "غلاية كهربائية", lang: "ar", baseScore: 58, trendBias: 0.2 },
  { query: "mascara", lang: "en", baseScore: 55, trendBias: -0.3 },
  { query: "ماكينة حلاقة", lang: "ar", baseScore: 52, trendBias: 0.1 },
  { query: "backpack", lang: "en", baseScore: 49, trendBias: 0.0 },
  { query: "اقلام تلوين", lang: "ar", baseScore: 44, trendBias: 0.6 },
];

/* Review building blocks — bilingual, tagged with aspect + sentiment. */
export const ASPECTS = ["Quality", "Value", "Shipping", "Authenticity", "Packaging", "Battery"] as const;

export const REVIEW_TEMPLATES: {
  lang: "ar" | "en";
  rating: number;
  title: string;
  body: string;
  aspect: string;
  sentiment: "positive" | "neutral" | "negative";
}[] = [
  { lang: "en", rating: 5, title: "Excellent and original", body: "Genuine product, works perfectly and arrived in two days. Highly recommend.", aspect: "Authenticity", sentiment: "positive" },
  { lang: "en", rating: 4, title: "Good value for money", body: "Does the job well for the price. Build quality could be a little better.", aspect: "Value", sentiment: "positive" },
  { lang: "en", rating: 2, title: "Slow delivery", body: "Item is fine but shipping took over a week and the box was dented.", aspect: "Shipping", sentiment: "negative" },
  { lang: "en", rating: 1, title: "Feels counterfeit", body: "Looks different from the official one, I think this is a fake. Disappointed.", aspect: "Authenticity", sentiment: "negative" },
  { lang: "en", rating: 5, title: "Battery lasts long", body: "Battery easily lasts a full day of heavy use. Very happy.", aspect: "Battery", sentiment: "positive" },
  { lang: "ar", rating: 5, title: "منتج أصلي وممتاز", body: "المنتج أصلي ويعمل بكفاءة عالية، والتوصيل كان سريع. أنصح به بشدة.", aspect: "Authenticity", sentiment: "positive" },
  { lang: "ar", rating: 4, title: "كويس بالنسبة للسعر", body: "جودة جيدة مقابل السعر، بس التغليف كان ممكن يكون أحسن.", aspect: "Value", sentiment: "positive" },
  { lang: "ar", rating: 2, title: "الشحن متأخر", body: "المنتج تمام بس الشحن أخد أكتر من أسبوع والكرتونة كانت مكسورة شوية.", aspect: "Shipping", sentiment: "negative" },
  { lang: "ar", rating: 1, title: "حاسبه مقلد", body: "شكله مختلف عن الأصلي، أعتقد ده تقليد. مش مبسوط من الشراء.", aspect: "Authenticity", sentiment: "negative" },
  { lang: "ar", rating: 3, title: "كويس بس مش ممتاز", body: "المنتج عادي، بيأدي الغرض بس مفيش حاجة مميزة فيه.", aspect: "Quality", sentiment: "neutral" },
];
