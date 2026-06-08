import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Compact stat tile for dashboard KPI rows. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  footer,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {Icon && <Icon className="size-4 text-muted-foreground/70" />}
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </div>
        {(hint || footer) && (
          <div className="text-xs text-muted-foreground">{footer ?? hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
