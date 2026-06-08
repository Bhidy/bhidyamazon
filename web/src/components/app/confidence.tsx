import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Confidence, Provenance } from "@/lib/types";

const META: Record<
  Confidence,
  {
    labelEn: string;
    labelAr: string;
    cls: string;
    dot: string;
    helpEn: string;
    helpAr: string;
  }
> = {
  high: {
    labelEn: "Verified",
    labelAr: "مؤكد",
    cls: "text-confidence-high bg-confidence-high/12",
    dot: "bg-confidence-high",
    helpEn: "Scraped fact — directly observed on amazon.eg.",
    helpAr: "بيانات مستخلصة — مرصودة مباشرةً على amazon.eg.",
  },
  medium: {
    labelEn: "Relative",
    labelAr: "نسبي",
    cls: "text-confidence-medium bg-confidence-medium/15",
    dot: "bg-confidence-medium",
    helpEn: "Ordinal / relative signal — comparable only within a category.",
    helpAr: "إشارة ترتيبية/نسبية — مقارنة داخل الفئة فقط.",
  },
  low: {
    labelEn: "Estimated",
    labelAr: "تقديري",
    cls: "text-confidence-low bg-confidence-low/15",
    dot: "bg-confidence-low",
    helpEn: "Modeled estimate — a rough indicator, not a fact.",
    helpAr: "تقدير نموذجي — مؤشر تقريبي، ليس حقيقة.",
  },
};

/** Small pill that labels a value's trust tier. Used wherever data is shown. */
export function ConfidenceBadge({
  confidence,
  note,
  className,
}: {
  confidence: Confidence;
  note?: string;
  className?: string;
}) {
  const m = META[confidence];
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
              m.cls,
              className,
            )}
          />
        }
      >
        <span className={cn("size-1.5 rounded-full", m.dot)} />
        <span data-bi-en="">{m.labelEn}</span>
        <span data-bi-ar="">{m.labelAr}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-xs">
        <span data-bi-en="">{m.helpEn}</span>
        <span data-bi-ar="">{m.helpAr}</span>
        {note ? <div className="mt-1 text-muted-foreground">{note}</div> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** Info dot that reveals where a value came from. */
export function ProvenanceHint({
  provenance,
  className,
}: {
  provenance: Provenance;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
        aria-label="Data source"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-xs">
        <div className="font-medium">
          <span data-bi-en="">Source: </span>
          <span data-bi-ar="">المصدر: </span>
          {provenance.source}
        </div>
        <div className="text-muted-foreground">
          <span data-bi-en="">Confidence: {provenance.confidence}</span>
          <span data-bi-ar="">الموثوقية: {provenance.confidence}</span>
          {provenance.isEstimated ? (
            <>
              <span data-bi-en=""> · estimated</span>
              <span data-bi-ar=""> · تقديري</span>
            </>
          ) : ""}
        </div>
        {provenance.note ? <div className="mt-1">{provenance.note}</div> : null}
      </TooltipContent>
    </Tooltip>
  );
}
