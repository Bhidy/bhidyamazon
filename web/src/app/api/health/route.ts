/**
 * Health / readiness probe — GET /api/health
 *
 * Reports whether the real amazon.eg dataset is present and how fresh it is, by
 * reading the manifest the scraper writes to web/src/data/real/meta.json (the
 * same dir real-store.ts reads). Cheap to hit, no upstream calls; suitable for
 * uptime monitors and the GitHub Actions / Vercel deploy gate.
 *
 *   ok       — meta.json present; data is being served.
 *   degraded — meta.json missing/unreadable; app falls back to seed synthesis.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// The manifest lives alongside the scraped JSON the app reads (see real-store.ts).
const META_PATH = path.join(process.cwd(), "src/data/real/meta.json");

// Always evaluate at request time so a fresh scrape is reflected immediately.
export const dynamic = "force-dynamic";

export function GET() {
  try {
    const meta = JSON.parse(readFileSync(META_PATH, "utf8")) as {
      scraped_at?: string | null;
      product_count?: number;
      categories?: string[];
    };

    return NextResponse.json({
      status: "ok",
      scrapedAt: meta.scraped_at ?? null,
      productCount: meta.product_count ?? 0,
      categories: meta.categories ?? [],
    });
  } catch {
    // meta.json absent/unreadable → the app is up but serving seed fallback data.
    return NextResponse.json(
      {
        status: "degraded",
        scrapedAt: null,
        productCount: 0,
        categories: [],
      },
      { status: 503 },
    );
  }
}
