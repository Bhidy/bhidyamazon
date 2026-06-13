import Link from "next/link";
import { Boxes } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductThumb } from "@/components/app/product-thumb";
import { RatingStars } from "@/components/app/rating-stars";
import { formatEgp, formatRank } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

/**
 * Similar products in Egypt — same-category (and same-brand) items from the
 * amazon.eg best-seller set we track, ranked by price proximity. Real tracked
 * products only; each card links to its own detail page.
 */
export function SimilarProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <Card className="gap-0">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="size-4 text-brand" />
          <span data-bi-en="">Similar products in Egypt</span>
          <span data-bi-ar="">منتجات مشابهة في مصر</span>
        </CardTitle>
        <CardDescription>
          <span data-bi-en="">Comparable amazon.eg items we track in the same category.</span>
          <span data-bi-ar="">منتجات amazon.eg مماثلة نتابعها في نفس الفئة.</span>
        </CardDescription>
      </CardHeader>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {products.map((p) => (
          <Link
            key={p.asin}
            href={`/products/${p.asin}`}
            className={cn(
              "card-hover group flex gap-3 rounded-xl border border-border/70 bg-card p-3",
              "hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <ProductThumb product={p} size={56} />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground group-hover:underline">
                {p.titleEn}
              </h3>
              {p.brand && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.brand}</p>
              )}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-bold tabular-nums text-primary">
                  {formatEgp(p.priceEgp)}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  BSR {formatRank(p.bsr)}
                </span>
              </div>
              <div className="mt-1">
                <RatingStars rating={p.rating} count={p.reviewCount} size={11} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
