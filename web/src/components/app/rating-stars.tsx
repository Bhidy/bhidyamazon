import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatRating } from "@/lib/format";

/** Accessible star rating with a precise partial-fill overlay + review count. */
export function RatingStars({
  rating,
  count,
  size = 14,
  showValue = true,
  className,
}: {
  rating?: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  if (rating == null) return <span className="text-xs text-muted-foreground">No rating</span>;
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  const stars = (cls: string) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={cls} style={{ width: size, height: size }} strokeWidth={1.5} />
    ));
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`${formatRating(rating)} out of 5 stars`}
    >
      <span className="relative inline-flex">
        <span className="inline-flex text-muted-foreground/30">{stars("fill-current")}</span>
        <span
          className="absolute inset-0 inline-flex overflow-hidden text-confidence-medium"
          style={{ width: `${pct}%` }}
        >
          {stars("fill-current shrink-0")}
        </span>
      </span>
      {showValue && (
        <span className="text-xs font-medium tabular-nums text-foreground">{formatRating(rating)}</span>
      )}
      {count != null && (
        <span className="text-xs tabular-nums text-muted-foreground">
          ({formatNumber(count, "en", { compact: true })})
        </span>
      )}
    </span>
  );
}
