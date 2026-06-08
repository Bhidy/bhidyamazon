/**
 * Static reference data + disclosure copy for the platform.
 * Marketplace facts are verified from the research dossier (docs/research).
 */

import type { Category, DemandBand } from "@/lib/types";

export const MARKETPLACE = {
  domain: "amazon.eg",
  /** Verified via Amazon's official PA-API / SP-API locale references. */
  marketplaceId: "ARBP9OOSHTCHU",
  currency: "EGP",
  vatRate: 0.14,
  /** amazon.eg runs on the MENA/UAE platform, hence the _AE language codes. */
  languages: { en: "en_AE", ar: "ar_AE" },
  bestSellersUrl: "https://www.amazon.eg/-/en/gp/bestsellers",
  moversUrl: "https://www.amazon.eg/-/en/gp/movers-and-shakers",
} as const;

/**
 * Top categories. Slugs confirmed live on amazon.eg; numeric browse-node IDs
 * are unpublished for .eg and must be harvested from the live nav, so we key
 * on slug until then.
 */
export const CATEGORIES: Category[] = [
  { nodeId: "electronics", slug: "electronics", nameEn: "Electronics", nameAr: "إلكترونيات" },
  { nodeId: "electronics-accessories", slug: "electronics-accessories", nameEn: "Electronics Accessories", nameAr: "إكسسوارات الإلكترونيات", parentNode: "electronics" },
  { nodeId: "beauty", slug: "beauty", nameEn: "Beauty", nameAr: "الجمال" },
  { nodeId: "home", slug: "home", nameEn: "Home & Kitchen", nameAr: "المنزل والمطبخ" },
  { nodeId: "office-products", slug: "office-products", nameEn: "Office Products", nameAr: "مستلزمات المكتب" },
  { nodeId: "fashion", slug: "fashion", nameEn: "Fashion", nameAr: "الموضة" },
  { nodeId: "grocery", slug: "grocery", nameEn: "Grocery", nameAr: "البقالة" },
  { nodeId: "toys", slug: "toys", nameEn: "Toys & Games", nameAr: "الألعاب" },
  { nodeId: "baby", slug: "baby", nameEn: "Baby", nameAr: "مستلزمات الأطفال" },
  { nodeId: "sports", slug: "sports", nameEn: "Sports", nameAr: "الرياضة" },
  { nodeId: "health", slug: "health", nameEn: "Health & Household", nameAr: "الصحة" },
  { nodeId: "books", slug: "books", nameEn: "Books", nameAr: "الكتب" },
];

export const CATEGORY_BY_NODE: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.nodeId, c]),
);

/** Sidebar navigation. `icon` is a lucide-react key resolved in the nav component. */
export interface NavItem {
  labelEn: string;
  labelAr: string;
  href: string;
  icon: string;
}
export interface NavGroup {
  labelEn: string;
  labelAr: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelEn: "Discover",
    labelAr: "اكتشف",
    items: [
      { labelEn: "Dashboard", labelAr: "لوحة التحكم", href: "/", icon: "LayoutDashboard" },
      { labelEn: "Best Sellers", labelAr: "الأكثر مبيعًا", href: "/bestsellers", icon: "Trophy" },
      { labelEn: "Movers & Shakers", labelAr: "الأكثر صعودًا", href: "/movers", icon: "TrendingUp" },
      { labelEn: "Demand Radar", labelAr: "رادار الطلب", href: "/keywords", icon: "Radar" },
    ],
  },
  {
    labelEn: "Research",
    labelAr: "البحث",
    items: [
      { labelEn: "Products", labelAr: "المنتجات", href: "/products", icon: "Boxes" },
      { labelEn: "Search", labelAr: "بحث", href: "/search", icon: "Search" },
    ],
  },
  {
    labelEn: "Tools",
    labelAr: "أدوات",
    items: [
      { labelEn: "Profit Calculator", labelAr: "حاسبة الربح", href: "/calculator", icon: "Calculator" },
      { labelEn: "Watchlists", labelAr: "قوائم المتابعة", href: "/watchlists", icon: "Bookmark" },
      { labelEn: "Alerts", labelAr: "التنبيهات", href: "/alerts", icon: "Bell" },
    ],
  },
  {
    labelEn: "Account",
    labelAr: "الحساب",
    items: [{ labelEn: "Settings", labelAr: "الإعدادات", href: "/settings", icon: "Settings" }],
  },
];

/** Visual + copy metadata for the relative demand band (within-category only). */
export const DEMAND_BAND_META: Record<
  DemandBand,
  { labelEn: string; labelAr: string; tone: "high" | "medium" | "low" | "muted" }
> = {
  "very-high": { labelEn: "Very High", labelAr: "مرتفع جدًا", tone: "high" },
  high: { labelEn: "High", labelAr: "مرتفع", tone: "high" },
  moderate: { labelEn: "Moderate", labelAr: "متوسط", tone: "medium" },
  low: { labelEn: "Low", labelAr: "منخفض", tone: "low" },
  unknown: { labelEn: "Unknown", labelAr: "غير معروف", tone: "muted" },
};

/**
 * Disclosure copy — surfaced persistently, never buried in tooltips.
 * These strings encode the audit's required uncertainty disclosures.
 */
export const DISCLOSURE = {
  calibrationNoticeEn:
    "amazon.eg sales signals are not calibrated against known Egyptian sales data. Treat ranks and demand as relative indicators — never as exact units sold or search volume.",
  calibrationNoticeAr:
    "إشارات المبيعات على amazon.eg غير معايرة مقابل بيانات مبيعات مصرية معروفة. تعامل مع الترتيب والطلب كمؤشرات نسبية — وليست أعدادًا مباعة أو حجم بحث دقيق.",
  demandProxyEn: "Estimated demand (relative interest), not true search volume.",
  demandProxyAr: "طلب تقديري (اهتمام نسبي)، وليس حجم بحث فعلي.",
  ordinalEn: "Rank is comparable only within the same category on amazon.eg.",
  estimatedFeesEn:
    "Fee rates are best-effort estimates — verify against sell.amazon.eg/pricing before relying on the numbers.",
} as const;

/** Confidence-tier display metadata. */
export const CONFIDENCE_META = {
  high: { labelEn: "Verified fact", labelAr: "حقيقة مؤكدة", token: "confidence-high" },
  medium: { labelEn: "Ordinal / relative", labelAr: "نسبي", token: "confidence-medium" },
  low: { labelEn: "Estimated", labelAr: "تقديري", token: "confidence-low" },
} as const;
