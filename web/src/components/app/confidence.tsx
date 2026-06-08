import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Confidence, Provenance } from "@/lib/types";

const META: Record<Confidence, { label: string; cls: string; dot: string; help: string }> = {
  high: {
    label: "Verified",
    cls: "text-confidence-high border-confidence-high/30 bg-confidence-high/10",
    dot: "bg-confidence-high",
    help: "Scraped fact — directly observed on amazon.eg.",
  },
  medium: {
    label: "Relative",
    cls: "text-confidence-medium border-confidence-medium/30 bg-confidence-medium/10",
    dot: "bg-confidence-medium",
    help: "Ordinal / relative signal — comparable only within a category.",
  },
  low: {
    label: "Estimated",
    cls: "text-confidence-low border-confidence-low/30 bg-confidence-low/10",
    dot: "bg-confidence-low",
    help: "Modeled estimate — a rough indicator, not a fact.",
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
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
              m.cls,
              className,
            )}
          />
        }
      >
        <span className={cn("size-1.5 rounded-full", m.dot)} />
        {m.label}
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-xs">
        {m.help}
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
        <div className="font-medium">Source: {provenance.source}</div>
        <div className="text-muted-foreground">
          Confidence: {provenance.confidence}
          {provenance.isEstimated ? " · estimated" : ""}
        </div>
        {provenance.note ? <div className="mt-1">{provenance.note}</div> : null}
      </TooltipContent>
    </Tooltip>
  );
}
