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
    <Card className={cn("gap-0 py-0 shadow-card", className)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {Icon && (
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground"
            >
              <Icon className="size-[1.05rem]" />
            </span>
          )}
        </div>
        <div className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
          {value}
        </div>
        {(hint || footer) && (
          <div className="text-xs text-muted-foreground">{footer ?? hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
