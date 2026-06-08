import Link from "next/link";
import { ProductThumb } from "@/components/app/product-thumb";
import { RatingStars } from "@/components/app/rating-stars";
import { ConfidenceBadge } from "@/components/app/confidence";
import { Card } from "@/components/ui/card";
import { formatEgp, formatRank } from "@/lib/format";
import { DISCLOSURE } from "@/lib/constants";
import type { Product } from "@/lib/types";

/**
 * Search/product grid tile — thumbnail, bilingual title, rating, ordinal BSR,
 * and price. The whole card links to the product detail page.
 */
export function ProductCard({ product }: { product: Product }) {
  const p = product;
  return (
    <Card
      size="sm"
      className="group/card gap-0 py-0 ring-foreground/10 transition-colors hover:ring-foreground/20"
    >
      <Link
        href={`/products/${p.asin}`}
        className="flex h-full flex-col gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
      >
        <div className="flex items-start gap-3">
          <ProductThumb product={p} size={56} />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover/card:underline">
              {p.titleEn}
            </div>
            {p.titleAr && (
              <div
                dir="rtl"
                className="mt-0.5 line-clamp-1 font-arabic text-xs text-muted-foreground"
              >
                {p.titleAr}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {p.brand && <span className="truncate">{p.brand}</span>}
              {p.brand && p.categoryName && <span aria-hidden>·</span>}
              {p.categoryName && <span className="truncate">{p.categoryName}</span>}
            </div>
          </div>
        </div>

        <RatingStars rating={p.rating} count={p.reviewCount} size={13} />

        <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
          <div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {formatEgp(p.priceEgp)}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="tabular-nums">BSR {formatRank(p.bsr)}</span>
              <ConfidenceBadge confidence="medium" note={DISCLOSURE.ordinalEn} />
            </div>
          </div>
          {p.inStock ? (
            <span className="text-xs font-medium text-positive">In stock</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Out of stock</span>
          )}
        </div>
      </Link>
    </Card>
  );
}
