import Link from "next/link";
import { Store, Star, Layers, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { Freshness } from "@/components/app/freshness";
import { ConfidenceBadge } from "@/components/app/confidence";
import { getSellers, getDashboardSummary } from "@/lib/data";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import { formatEgp, formatNumber, formatRank, formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function SellersPage() {
  const sellers = getSellers();
  const freshnessIso = getDashboardSummary().lastUpdated;

  return (
    <>
      <PageHeader
        title={
          <>
            <span data-bi-en="">Sellers</span>
            <span data-bi-ar="">البائعون</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">
              Brands &amp; stores behind the amazon.eg best-seller listings we track — their product
              footprint, ratings, pricing and how to compete. Egypt marketplace only.
            </span>
            <span data-bi-ar="">
              العلامات والمتاجر خلف قوائم الأكثر مبيعاً على amazon.eg التي نتابعها — منتجاتهم وتقييماتهم
              وأسعارهم وكيفية منافستهم. السوق المصري فقط.
            </span>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-card">
        <Freshness iso={freshnessIso} />
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ConfidenceBadge
            confidence="high"
            note="Seller = brand/store byline on tracked amazon.eg listings; a sample, not their full catalogue."
          />
          <span data-bi-en="">{formatNumber(sellers.length)} sellers tracked</span>
          <span data-bi-ar="">{formatNumber(sellers.length)} بائع متابَع</span>
        </span>
      </div>

      {sellers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <span data-bi-en="">No sellers tracked yet — they appear once products are enriched with brand data.</span>
            <span data-bi-ar="">لا يوجد بائعون متابَعون بعد — يظهرون بمجرد إثراء المنتجات ببيانات العلامة.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => {
            const cats = s.categories
              .map((c) => CATEGORY_BY_NODE[c]?.nameEn ?? c)
              .slice(0, 3);
            return (
              <Link
                key={s.slug}
                href={`/sellers/${s.slug}`}
                className={cn(
                  "card-hover group flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-card",
                  "hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground">
                      <Store className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground group-hover:underline">
                        {s.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        <span data-bi-en="">{formatNumber(s.productCount)} tracked product{s.productCount === 1 ? "" : "s"}</span>
                        <span data-bi-ar="">{formatNumber(s.productCount)} منتج متابَع</span>
                      </p>
                    </div>
                  </div>
                  {s.avgRating != null && (
                    <Badge variant="secondary" className="shrink-0 gap-1 tabular-nums">
                      <Star className="size-3 fill-current text-amber-500" />
                      {formatRating(s.avgRating)}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Metric
                    icon={<Package className="size-3.5" />}
                    labelEn="Best BSR"
                    labelAr="أفضل ترتيب"
                    value={formatRank(s.bestBsr)}
                  />
                  <Metric
                    icon={<Star className="size-3.5" />}
                    labelEn="Reviews"
                    labelAr="المراجعات"
                    value={formatNumber(s.totalReviews)}
                  />
                  <Metric
                    icon={<Layers className="size-3.5" />}
                    labelEn="Price from"
                    labelAr="السعر من"
                    value={formatEgp(s.minPriceEgp)}
                  />
                  <Metric
                    icon={<Layers className="size-3.5" />}
                    labelEn="Categories"
                    labelAr="الفئات"
                    value={formatNumber(s.categories.length)}
                  />
                </div>

                {cats.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cats.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function Metric({
  icon,
  labelEn,
  labelAr,
  value,
}: {
  icon: React.ReactNode;
  labelEn: string;
  labelAr: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5">
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        <span data-bi-en="">{labelEn}</span>
        <span data-bi-ar="">{labelAr}</span>
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
