/**
 * Schema guards for the scraped JSON the app trusts (web/src/data/real/*).
 *
 * This is the contract at the system's most critical boundary: the scraper
 * writes these files and a cloud workflow commits them WITHOUT human review,
 * so a malformed or drifted file must be rejected here — falling back to seed
 * data and surfacing the reason via /api/health — never rendered as fact.
 *
 * Used in three places (one source of truth):
 *  - real-store.ts rejects invalid files at read time,
 *  - __tests__/real-data-integrity.test.ts validates the committed files in CI,
 *  - the scrape-and-deploy workflow runs that test BEFORE committing a refresh.
 *
 * Checks are strict on structure and types, lenient on optional fields —
 * enrichment fields may be absent, values may be null; what must never happen
 * is a missing asin, a string where the UI does math, or an unknown
 * schema_version silently reinterpreted.
 */

type Any = Record<string, unknown>;

export const BESTSELLERS_SCHEMA_VERSION = 3;
export const PRODUCTS_SCHEMA_VERSION = 3;
export const SNAPSHOTS_SCHEMA_VERSION = 1;

function isObj(x: unknown): x is Any {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function optNum(x: unknown): boolean {
  return x == null || typeof x === "number";
}
function optStr(x: unknown): boolean {
  return x == null || typeof x === "string";
}

function validateRow(r: unknown, where: string): string | null {
  if (!isObj(r)) return `${where}: row is not an object`;
  if (typeof r.asin !== "string" || !r.asin) return `${where}: missing asin`;
  if (typeof r.category !== "string" || !r.category) return `${where} (${r.asin}): missing category`;
  if (!optNum(r.rank)) return `${where} (${r.asin}): rank is not a number`;
  if (!optNum(r.price_egp)) return `${where} (${r.asin}): price_egp is not a number`;
  if (!optNum(r.rating)) return `${where} (${r.asin}): rating is not a number`;
  if (!optNum(r.reviews)) return `${where} (${r.asin}): reviews is not a number`;
  if (!optStr(r.title)) return `${where} (${r.asin}): title is not a string`;
  if (!optStr(r.title_ar)) return `${where} (${r.asin}): title_ar is not a string`;
  if (!optStr(r.image_url)) return `${where} (${r.asin}): image_url is not a string`;
  return null;
}

/** bestsellers.json — the file that decides real-vs-seed mode. */
export function validateBestsellers(j: unknown): string | null {
  if (!isObj(j)) return "not an object";
  if (j.schema_version !== BESTSELLERS_SCHEMA_VERSION)
    return `schema_version ${String(j.schema_version)} (expected ${BESTSELLERS_SCHEMA_VERSION})`;
  if (typeof j.scraped_at !== "string" || !j.scraped_at) return "missing scraped_at";
  if (!Array.isArray(j.all)) return "all is not an array";
  for (let i = 0; i < j.all.length; i++) {
    const err = validateRow(j.all[i], `all[${i}]`);
    if (err) return err;
  }
  if (!isObj(j.categories)) return "categories is not an object";
  for (const [node, rows] of Object.entries(j.categories)) {
    if (!Array.isArray(rows)) return `categories.${node} is not an array`;
    for (let i = 0; i < rows.length; i++) {
      const err = validateRow(rows[i], `categories.${node}[${i}]`);
      if (err) return err;
    }
  }
  return null;
}

/** products.json — enrichment (all fields optional, but types must hold). */
export function validateProducts(j: unknown): string | null {
  if (!isObj(j)) return "not an object";
  if (j.schema_version !== PRODUCTS_SCHEMA_VERSION)
    return `schema_version ${String(j.schema_version)} (expected ${PRODUCTS_SCHEMA_VERSION})`;
  if (!isObj(j.products)) return "products is not an object";
  for (const [asin, p] of Object.entries(j.products)) {
    if (!isObj(p)) return `products.${asin} is not an object`;
    if (!optNum(p.price_egp)) return `products.${asin}: price_egp is not a number`;
    if (!optNum(p.rating)) return `products.${asin}: rating is not a number`;
    if (!optNum(p.reviews)) return `products.${asin}: reviews is not a number`;
    if (!optNum(p.item_weight_kg)) return `products.${asin}: item_weight_kg is not a number`;
    if (!optNum(p.image_count)) return `products.${asin}: image_count is not a number`;
    if (p.bsr != null && !Array.isArray(p.bsr)) return `products.${asin}: bsr is not an array`;
    if (p.reviews_list != null && !Array.isArray(p.reviews_list))
      return `products.${asin}: reviews_list is not an array`;
    if (p.offers != null && !Array.isArray(p.offers))
      return `products.${asin}: offers is not an array`;
    if (p.item_dims_cm != null) {
      const d = p.item_dims_cm;
      if (!isObj(d) || !optNum(d.l) || !optNum(d.w) || !optNum(d.h))
        return `products.${asin}: item_dims_cm is malformed`;
    }
  }
  return null;
}

/** snapshots.json — the append-only series behind BSR history and Movers. */
export function validateSnapshots(j: unknown): string | null {
  if (!isObj(j)) return "not an object";
  if (j.schema_version !== SNAPSHOTS_SCHEMA_VERSION)
    return `schema_version ${String(j.schema_version)} (expected ${SNAPSHOTS_SCHEMA_VERSION})`;
  if (!isObj(j.snapshots)) return "snapshots is not an object";
  for (const [asin, series] of Object.entries(j.snapshots)) {
    if (!Array.isArray(series)) return `snapshots.${asin} is not an array`;
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      if (!isObj(s)) return `snapshots.${asin}[${i}] is not an object`;
      if (typeof s.date !== "string" || !s.date) return `snapshots.${asin}[${i}]: missing date`;
      if (!optNum(s.rank)) return `snapshots.${asin}[${i}]: rank is not a number`;
      if (!optNum(s.price)) return `snapshots.${asin}[${i}]: price is not a number`;
    }
  }
  return null;
}

/** keywords.json — written by the trends worker (no schema_version field). */
export function validateKeywords(j: unknown): string | null {
  if (!isObj(j)) return "not an object";
  if (!optStr(j.scraped_at)) return "scraped_at is not a string";
  if (!Array.isArray(j.keywords)) return "keywords is not an array";
  for (let i = 0; i < j.keywords.length; i++) {
    const k = j.keywords[i];
    if (!isObj(k)) return `keywords[${i}] is not an object`;
    if (typeof k.query !== "string" || !k.query) return `keywords[${i}]: missing query`;
    if (!optNum(k.demandScore) && !optNum(k.score)) return `keywords[${i}]: score is not a number`;
    if (!optStr(k.lang)) return `keywords[${i}]: lang is not a string`;
  }
  return null;
}

export const VALIDATORS: Record<string, (j: unknown) => string | null> = {
  "bestsellers.json": validateBestsellers,
  "products.json": validateProducts,
  "snapshots.json": validateSnapshots,
  "keywords.json": validateKeywords,
};
