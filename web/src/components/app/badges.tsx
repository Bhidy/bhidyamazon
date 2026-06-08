import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMAND_BAND_META } from "@/lib/constants";
import type { DemandBand } from "@/lib/types";

const TONE_CLS: Record<string, string> = {
  high: "text-positive border-positive/30 bg-positive/10",
  medium: "text-confidence-medium border-confidence-medium/30 bg-confidence-medium/10",
  low: "text-muted-foreground border-border bg-muted",
  muted: "text-muted-foreground border-border bg-muted",
};

/** Relative-demand pill (within-category only — never a unit count). */
export function DemandBadge({ band, className }: { band: DemandBand; className?: string }) {
  const meta = DEMAND_BAND_META[band];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLS[meta.tone],
        className,
      )}
    >
      {meta.labelEn}
    </span>
  );
}

/**
 * Directional trend chip. `value` is a percentage; positive = up.
 * Pass `invert` when a lower raw number is better (e.g. BSR).
 */
export function TrendIndicator({
  value,
  suffix = "%",
  invert = false,
  className,
}: {
  value: number;
  suffix?: string;
  invert?: boolean;
  className?: string;
}) {
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.5;
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const tone = flat
    ? "text-muted-foreground"
    : good
      ? "text-positive"
      : "text-negative";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", tone, className)}>
      <Icon className="size-3.5" />
      {value > 0 ? "+" : ""}
      {Math.round(value)}
      {suffix}
    </span>
  );
}
