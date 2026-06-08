import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemandTrend } from "@/lib/types";

const META: Record<DemandTrend, { label: string; Icon: typeof TrendingUp; cls: string }> = {
  rising: { label: "Rising", Icon: TrendingUp, cls: "text-positive" },
  falling: { label: "Falling", Icon: TrendingDown, cls: "text-falling" },
  flat: { label: "Flat", Icon: Minus, cls: "text-muted-foreground" },
};

/**
 * Directional demand-trend chip — a WORD, never a fabricated percentage.
 * (Keyword demand has no real magnitude, only a direction, so showing a
 * numeric "+12%" via the same chip as real data would be dishonest.)
 */
export function DemandTrendChip({ trend, className }: { trend: DemandTrend; className?: string }) {
  const m = META[trend];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-semibold",
        m.cls,
        className,
      )}
    >
      <m.Icon className="size-3.5" />
      {m.label}
    </span>
  );
}
