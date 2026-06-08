import Link from "next/link";
import { Search, SearchX, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ConfidenceBadge } from "@/components/app/confidence";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { searchProducts } from "@/lib/data";
import { MARKETPLACE } from "@/lib/constants";
import { SearchBox } from "./_components/search-box";
import { ProductCard } from "./_components/product-card";

/**
 * Suggested starter queries. Each is verified to resolve against the seed
 * catalogue's naive substring/Arabic search so the chips never lead to a dead
 * zero-results screen.
 */
const SUGGESTED_QUERIES: { label: string; lang: "en" | "ar" }[] = [
  { label: "earbuds", lang: "en" },
  { label: "charger", lang: "en" },
  { label: "airfryer", lang: "en" },
  { label: "serum", lang: "en" },
  { label: "شاحن", lang: "ar" },
  { label: "سماعات", lang: "ar" },
];

/** Honest note: today search matches the tracked catalogue; live SERP scraping is a later upgrade. */
function SerpProvenanceCaption() {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <ConfidenceBadge
        confidence="medium"
        note={`Matches across products Rasid tracks on ${MARKETPLACE.domain}. Live ${MARKETPLACE.domain} SERP scraping is a later upgrade; results here come from the tracked catalogue.`}
      />
      <span>
        Matches across products tracked on {MARKETPLACE.domain} — not a live ranked index.
      </span>
    </p>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const results = query ? searchProducts(query) : [];

  return (
    <>
      <PageHeader title="Search" description="Find any product on amazon.eg by name." />

      <Card className="gap-0">
        <CardContent className="p-4">
          <SearchBox initialQuery={query} />
          <div className="mt-3">
            <SerpProvenanceCaption />
          </div>
        </CardContent>
      </Card>



      {!query ? (
        <Card className="gap-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <CardTitle className="text-base">Start with a search</CardTitle>
            </div>
            <CardDescription>
              Type a product, brand, or keyword above — or try one of these.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((s) => (
                <Link
                  key={s.label}
                  href={`/search?q=${encodeURIComponent(s.label)}`}
                  dir={s.lang === "ar" ? "rtl" : "ltr"}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-foreground/20 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" +
                    (s.lang === "ar" ? " font-arabic" : "")
                  }
                >
                  <Search className="size-3.5 text-muted-foreground" aria-hidden />
                  {s.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card className="gap-0">
          <CardContent className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No results for{" "}
                <span className="font-semibold">&ldquo;{query}&rdquo;</span>
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Nothing on amazon.eg matched that term. Check the spelling, try a
                broader keyword, or search in Arabic.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUERIES.map((s) => (
                <Link
                  key={s.label}
                  href={`/search?q=${encodeURIComponent(s.label)}`}
                  dir={s.lang === "ar" ? "rtl" : "ltr"}
                  className={
                    "inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" +
                    (s.lang === "ar" ? " font-arabic" : "")
                  }
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">
              <span className="tabular-nums">{results.length}</span>{" "}
              {results.length === 1 ? "result" : "results"} for{" "}
              <span className="font-semibold">&ldquo;{query}&rdquo;</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              Ranked as shown on {MARKETPLACE.domain}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((product) => (
              <ProductCard key={product.asin} product={product} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
