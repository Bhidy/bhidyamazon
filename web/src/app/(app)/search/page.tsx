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

const SUGGESTED_QUERIES: { label: string; lang: "en" | "ar" }[] = [
  { label: "earbuds", lang: "en" },
  { label: "charger", lang: "en" },
  { label: "airfryer", lang: "en" },
  { label: "serum", lang: "en" },
  { label: "شاحن", lang: "ar" },
  { label: "سماعات", lang: "ar" },
];

function SerpProvenanceCaption() {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <ConfidenceBadge
        confidence="medium"
        note={`Matches across products Rasid tracks on ${MARKETPLACE.domain}. Live ${MARKETPLACE.domain} SERP scraping is a later upgrade; results here come from the tracked catalogue.`}
      />
      <span>
        <span data-bi-en="">Matches across products tracked on {MARKETPLACE.domain} — not a live ranked index.</span>
        <span data-bi-ar="">نتائج من المنتجات التي تتتبعها رصيد على {MARKETPLACE.domain} — ليس فهرساً مباشراً.</span>
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
      <PageHeader
        title={
          <>
            <span data-bi-en="">Search</span>
            <span data-bi-ar="">بحث</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">Find any product on amazon.eg by name.</span>
            <span data-bi-ar="">ابحث عن أي منتج في amazon.eg بالاسم.</span>
          </>
        }
      />

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
              <CardTitle className="text-base">
                <span data-bi-en="">Start with a search</span>
                <span data-bi-ar="">ابدأ بالبحث</span>
              </CardTitle>
            </div>
            <CardDescription>
              <span data-bi-en="">Type a product, brand, or keyword above — or try one of these.</span>
              <span data-bi-ar="">اكتب منتجاً أو علامة تجارية أو كلمة مفتاحية أعلاه — أو جرب أحد هذه.</span>
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
                <span data-bi-en="">No results for <span className="font-semibold">&ldquo;{query}&rdquo;</span></span>
                <span data-bi-ar="">لا نتائج لـ <span className="font-semibold">&rdquo;{query}&ldquo;</span></span>
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                <span data-bi-en="">Nothing on amazon.eg matched that term. Check the spelling, try a broader keyword, or search in Arabic.</span>
                <span data-bi-ar="">لم يتطابق أي شيء في amazon.eg مع هذا المصطلح. تحقق من الإملاء، جرب كلمة أوسع، أو ابحث بالعربية.</span>
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
              <span data-bi-en="">
                <span className="tabular-nums">{results.length}</span>{" "}
                {results.length === 1 ? "result" : "results"} for{" "}
                <span className="font-semibold">&ldquo;{query}&rdquo;</span>
              </span>
              <span data-bi-ar="">
                <span className="tabular-nums">{results.length}</span>{" "}
                {results.length === 1 ? "نتيجة" : "نتائج"} لـ{" "}
                <span className="font-semibold">&rdquo;{query}&ldquo;</span>
              </span>
            </h2>
            <span className="text-xs text-muted-foreground">
              <span data-bi-en="">Ranked as shown on {MARKETPLACE.domain}</span>
              <span data-bi-ar="">مرتبة كما تظهر على {MARKETPLACE.domain}</span>
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
