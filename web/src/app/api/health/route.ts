/**
 * Health / readiness probe — GET /api/health
 *
 * Reports whether the real amazon.eg dataset is present, fresh, and VALID, by
 * reading the manifest the scraper writes (meta.json) and the schema-rejection
 * reasons collected by real-store.ts. Cheap to hit, no upstream calls; suitable
 * for uptime monitors and the GitHub Actions / Vercel deploy gate.
 *
 *   ok       — dataset present and serving; `issues` may still list a broken
 *              secondary channel (e.g. keywords.json failed validation).
 *   degraded — manifest missing/unreadable, or a CORE data file
 *              (bestsellers/products/snapshots) failed schema validation; the
 *              app is up but fully or partly on seed fallback.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { dataIssues } from "@/lib/real-store";

// The manifest lives alongside the scraped JSON the app reads (see real-store.ts).
const META_PATH = path.join(process.cwd(), "src/data/real/meta.json");

// Core files: an invalid one means the main dataset is not being served.
const CORE_FILES = ["bestsellers.json", "products.json", "snapshots.json"];

// Always evaluate at request time so a fresh scrape is reflected immediately.
export const dynamic = "force-dynamic";

export function GET() {
  const issues = dataIssues();
  const coreBroken = CORE_FILES.some((f) => f in issues);

  let meta: { scraped_at?: string | null; product_count?: number; categories?: string[] } | null = null;
  try {
    meta = JSON.parse(readFileSync(META_PATH, "utf8"));
  } catch {
    meta = null;
  }

  if (!meta || coreBroken) {
    return NextResponse.json(
      {
        status: "degraded",
        scrapedAt: meta?.scraped_at ?? null,
        productCount: 0,
        categories: [],
        issues,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "ok",
    scrapedAt: meta.scraped_at ?? null,
    productCount: meta.product_count ?? 0,
    categories: meta.categories ?? [],
    issues, // non-core problems (e.g. stale/invalid keywords.json) show up here
  });
}
