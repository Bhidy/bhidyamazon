/**
 * Integrity gate for the COMMITTED real data files (no mocks — this validates
 * the actual web/src/data/real/*.json on disk against real-schema.ts).
 *
 * Runs in two gates:
 *  - ci.yml on every push/PR (a bad hand-edit or merge cannot land), and
 *  - scrape-and-deploy.yml right after the scrape and BEFORE the data commit,
 *    so a drifted scraper output fails the run (which auto-opens an issue)
 *    instead of being committed and silently rejected at render time.
 *
 * A missing file is fine (fresh checkout / seed mode is by design); a present
 * file MUST parse and validate.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  validateBestsellers,
  validateKeywords,
  validateProducts,
  validateSnapshots,
} from "@/lib/real-schema";

const DIR = path.join(process.cwd(), "src/data/real");

function readIfPresent(name: string): unknown | null {
  const f = path.join(DIR, name);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, "utf8")); // a parse error fails the test — intended
}

describe("committed real-data files validate against the schema contract", () => {
  it("bestsellers.json", () => {
    const j = readIfPresent("bestsellers.json");
    if (j === null) return; // absent → seed mode, nothing to validate
    expect(validateBestsellers(j)).toBeNull();
  });

  it("products.json", () => {
    const j = readIfPresent("products.json");
    if (j === null) return;
    expect(validateProducts(j)).toBeNull();
  });

  it("snapshots.json", () => {
    const j = readIfPresent("snapshots.json");
    if (j === null) return;
    expect(validateSnapshots(j)).toBeNull();
  });

  it("keywords.json", () => {
    const j = readIfPresent("keywords.json");
    if (j === null) return;
    expect(validateKeywords(j)).toBeNull();
  });

  // Egypt-only platform gate: amazon.eg dp pages embed a "Top reviews from other
  // countries" block sharing data-hook='review'. A scraper regression that ingests
  // them must FAIL here (in ci.yml and in scrape-and-deploy BEFORE the data commit)
  // rather than leak foreign reviews into production. A foreign review's date line
  // reads "Reviewed in <Country> on …"; Egypt reads "Reviewed in Egypt" / "مصر".
  it("products.json contains ONLY Egypt-origin reviews", () => {
    const j = readIfPresent("products.json") as {
      products?: Record<string, { reviews_list?: { date?: string | null }[] }>;
    } | null;
    if (j === null) return;
    const foreign: string[] = [];
    for (const [asin, p] of Object.entries(j.products ?? {})) {
      for (const r of p.reviews_list ?? []) {
        const m = /Reviewed in (.+?) on/i.exec(r.date ?? "");
        if (!m) continue; // no country marker → local block → allowed
        const country = m[1].toLowerCase();
        if (!country.includes("egypt") && !country.includes("مصر")) {
          foreign.push(`${asin}: "${r.date}"`);
        }
      }
    }
    expect(foreign, `Non-Egypt reviews must never be committed:\n${foreign.join("\n")}`).toEqual([]);
  });

  it("meta.json agrees with bestsellers.json (count + categories)", () => {
    const meta = readIfPresent("meta.json") as {
      product_count?: number;
      categories?: string[];
      scraped_at?: string;
    } | null;
    const bs = readIfPresent("bestsellers.json") as {
      all?: unknown[];
      categories?: Record<string, unknown>;
      scraped_at?: string;
    } | null;
    if (!meta || !bs) return;
    expect(meta.product_count).toBe(bs.all?.length ?? 0);
    expect(new Set(meta.categories)).toEqual(new Set(Object.keys(bs.categories ?? {})));
    expect(meta.scraped_at).toBe(bs.scraped_at);
  });
});

describe("schema guards reject drifted payloads (sanity of the gate itself)", () => {
  it("rejects a wrong schema_version", () => {
    expect(validateBestsellers({ schema_version: 99, scraped_at: "x", all: [], categories: {} })).toMatch(
      /schema_version/,
    );
  });
  it("rejects a row missing its asin", () => {
    expect(
      validateBestsellers({
        schema_version: 3,
        scraped_at: "x",
        all: [{ category: "toys", rank: 1 }],
        categories: {},
      }),
    ).toMatch(/asin/);
  });
  it("rejects a stringly-typed price (UI does math on it)", () => {
    expect(
      validateBestsellers({
        schema_version: 3,
        scraped_at: "x",
        all: [{ asin: "B000000001", category: "toys", price_egp: "1,299" }],
        categories: {},
      }),
    ).toMatch(/price_egp/);
  });
  it("rejects a snapshot entry without a date", () => {
    expect(
      validateSnapshots({ schema_version: 1, snapshots: { A1: [{ rank: 3 }] } }),
    ).toMatch(/date/);
  });
});
