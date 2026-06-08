import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemandTrend } from "@/lib/types";

const META: Record<DemandTrend, { labelEn: string; labelAr: string; Icon: typeof TrendingUp; cls: string }> = {
  rising: { labelEn: "Rising", labelAr: "صاعد", Icon: TrendingUp, cls: "text-positive" },
  falling: { labelEn: "Falling", labelAr: "هابط", Icon: TrendingDown, cls: "text-falling" },
  flat: { labelEn: "Flat", labelAr: "مستقر", Icon: Minus, cls: "text-muted-foreground" },
};

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
      <span data-bi-en="">{m.labelEn}</span>
      <span data-bi-ar="">{m.labelAr}</span>
    </span>
  );
}
