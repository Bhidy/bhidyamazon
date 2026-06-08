import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISCLOSURE } from "@/lib/constants";

/**
 * Persistent, never-buried notice that the platform's sales/demand signals are
 * relative — not exact units or search volume. Required by the feasibility
 * audit's UI-disclosure rules; render it on every screen that shows ranks/demand.
 * Uses CSS bilingual data attributes so it works in both server and client renders.
 */
export function CalibrationNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-confidence-medium/25 bg-confidence-medium/[0.08] px-4 py-3 text-xs text-muted-foreground shadow-card",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-lg bg-confidence-medium/15 text-confidence-medium"
      >
        <TriangleAlert className="size-4" />
      </span>
      <p className="self-center">
        <span data-bi-en="">
          <span className="font-semibold text-foreground">Read signals as relative. </span>
          {DISCLOSURE.calibrationNoticeEn}
        </span>
        <span data-bi-ar="">
          <span className="font-semibold text-foreground">اقرأ الإشارات كمؤشرات نسبية. </span>
          {DISCLOSURE.calibrationNoticeAr}
        </span>
      </p>
    </div>
  );
}
