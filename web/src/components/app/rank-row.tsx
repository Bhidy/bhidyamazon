import Link from "next/link";
import { ProductThumb } from "@/components/app/product-thumb";
import { DemandBadge, TrendIndicator } from "@/components/app/badges";
import { RatingStars } from "@/components/app/rating-stars";
import { Spark } from "@/components/app/bsr-spark";
import { formatEgp, formatRank } from "@/lib/format";
import { getBsrHistory } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { RankingRow } from "@/lib/types";

/** Dense, reusable ranking row used by the dashboard, best-sellers, and movers. */
export function RankRow({ row, showSpark = true }: { row: RankingRow; showSpark?: boolean }) {
  const p = row.product;
  const hist = getBsrHistory(p.asin).points.map((pt) => pt.value);
  // Top three ranks earn a lime/pale-lime chip; the rest stay muted.
  const rankChip =
    row.rank === 1
      ? "bg-brand text-brand-foreground"
      : row.rank <= 3
        ? "bg-accent text-brand-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <Link
      href={`/products/${p.asin}`}
      className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/40"
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold tabular-nums",
          rankChip,
        )}
      >
        {row.rank}
      </span>
      <ProductThumb product={p} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground group-hover:underline">
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
        <div className="text-sm font-bold tabular-nums text-primary">{formatEgp(p.priceEgp)}</div>
        {row.listType === "movers" ? (
          <TrendIndicator value={row.gainPct ?? 0} className="justify-end" />
        ) : (
          <span className="text-xs tabular-nums text-muted-foreground">BSR {formatRank(p.bsr)}</span>
        )}
      </div>
    </Link>
  );
}
