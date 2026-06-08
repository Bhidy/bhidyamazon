import Link from "next/link";
import { ProductThumb } from "@/components/app/product-thumb";
import { DemandBadge } from "@/components/app/badges";
import { RatingStars } from "@/components/app/rating-stars";
import { formatEgp, formatRank } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RankingRow } from "@/lib/types";

/**
 * Catalogue card. Plain server component — the entire card is a Link to the
 * product detail route. Mirrors the dashboard's institutional restraint:
 * tabular numbers, bilingual title, and the within-category demand band.
 */
export function ProductCard({ row }: { row: RankingRow }) {
  const p = row.product;
  return (
    <Link
      href={`/products/${p.asin}`}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors",
        "hover:border-brand/40 hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <div className="flex items-start gap-3">
        <ProductThumb product={p} size={64} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:underline">
            {p.titleEn}
          </h3>
          {p.titleAr && (
            <p dir="rtl" className="mt-0.5 line-clamp-1 font-arabic text-xs text-muted-foreground">
              {p.titleAr}
            </p>
          )}
          {p.brand && (
            <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{p.brand}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <RatingStars rating={p.rating} count={p.reviewCount} size={13} />
        <DemandBadge band={row.demandBand} />
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
        <span className="text-base font-semibold tabular-nums text-foreground">
          {formatEgp(p.priceEgp)}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          BSR {formatRank(p.bsr)}
        </span>
      </div>
    </Link>
  );
}
