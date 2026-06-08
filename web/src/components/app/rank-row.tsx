import Link from "next/link";
import { ProductThumb } from "@/components/app/product-thumb";
import { DemandBadge, TrendIndicator } from "@/components/app/badges";
import { RatingStars } from "@/components/app/rating-stars";
import { Spark } from "@/components/app/bsr-spark";
import { formatEgp, formatRank } from "@/lib/format";
import { getBsrHistory } from "@/lib/data";
import type { RankingRow } from "@/lib/types";

/** Dense, reusable ranking row used by the dashboard, best-sellers, and movers. */
export function RankRow({ row, showSpark = true }: { row: RankingRow; showSpark?: boolean }) {
  const p = row.product;
  const hist = getBsrHistory(p.asin).points.map((pt) => pt.value);
  return (
    <Link
      href={`/products/${p.asin}`}
      className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
    >
      <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {row.rank}
      </span>
      <ProductThumb product={p} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground group-hover:underline">
          {p.titleEn}
        </div>
        <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
          <span className="shrink-0">{p.brand}</span>
          <span aria-hidden>·</span>
          <span dir="rtl" className="truncate font-arabic">
            {p.titleAr}
          </span>
        </div>
      </div>
      <RatingStars rating={p.rating} count={p.reviewCount} showValue={false} size={12} className="hidden sm:inline-flex" />
      <DemandBadge band={row.demandBand} className="hidden md:inline-flex" />
      {showSpark && (
        <div className="hidden lg:block" aria-hidden>
          <Spark data={hist} invert />
        </div>
      )}
      <div className="w-20 shrink-0 text-end">
        <div className="text-sm font-semibold tabular-nums text-foreground">{formatEgp(p.priceEgp)}</div>
        {row.listType === "movers" ? (
          <TrendIndicator value={row.gainPct ?? 0} className="justify-end" />
        ) : (
          <span className="text-xs tabular-nums text-muted-foreground">BSR {formatRank(p.bsr)}</span>
        )}
      </div>
    </Link>
  );
}
