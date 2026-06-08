import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMAND_BAND_META } from "@/lib/constants";
import type { DemandBand } from "@/lib/types";

const TONE_CLS: Record<string, string> = {
  high: "text-positive bg-positive/12",
  medium: "text-confidence-medium bg-confidence-medium/15",
  low: "text-muted-foreground bg-secondary",
  muted: "text-muted-foreground bg-secondary",
};

/** Relative-demand pill — uses bilingual data attributes for instant CSS switching. */
export function DemandBadge({ band, className }: { band: DemandBand; className?: string }) {
  const meta = DEMAND_BAND_META[band];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLS[meta.tone],
        className,
      )}
    >
      <span data-bi-en="">{meta.labelEn}</span>
      <span data-bi-ar="">{meta.labelAr}</span>
    </span>
  );
}

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
      : "text-falling";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", tone, className)}>
      <Icon className="size-3.5" />
      {value > 0 ? "+" : ""}
      {Math.round(value)}
      {suffix}
    </span>
  );
}
