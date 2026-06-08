import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISCLOSURE } from "@/lib/constants";

/**
 * Persistent, never-buried notice that the platform's sales/demand signals are
 * relative — not exact units or search volume. Required by the feasibility
 * audit's UI-disclosure rules; render it on every screen that shows ranks/demand.
 */
export function CalibrationNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-confidence-medium/30 bg-confidence-medium/[0.07] px-3 py-2.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-confidence-medium" />
      <p>
        <span className="font-medium text-foreground">Read signals as relative. </span>
        {DISCLOSURE.calibrationNoticeEn}
      </p>
    </div>
  );
}
