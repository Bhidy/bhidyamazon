/**
 * Shared display metadata for the Opportunity Finder — verdict styling, per-
 * criterion icons, band tones, and confidence-tier chips. Pure data + tiny
 * presentational helpers (no hooks) so both the card and the explorer can use it.
 */
import {
  Car,
  Eye,
  Feather,
  Layers,
  Package,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Swords,
  Tag,
  TrendingUp,
  Truck,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import type { CriterionBand, CriterionKey, WpsConfidence, WpsVerdict } from "@/lib/types";

export type BadgeVariant = "success" | "brand" | "warning" | "destructive" | "outline";

export const VERDICT_META: Record<
  WpsVerdict,
  { en: string; ar: string; variant: BadgeVariant; tone: string; surface: string }
> = {
  winner: { en: "Winner", ar: "منتج رابح", variant: "success", tone: "text-positive", surface: "border-positive/40 bg-positive/[0.06]" },
  promising: { en: "Promising", ar: "واعد", variant: "brand", tone: "text-brand-foreground", surface: "border-brand/40 bg-accent" },
  marginal: { en: "Marginal", ar: "حدّي", variant: "warning", tone: "text-confidence-medium", surface: "border-confidence-medium/40 bg-confidence-medium/[0.07]" },
  avoid: { en: "Avoid", ar: "تجنّب", variant: "destructive", tone: "text-destructive", surface: "border-destructive/30 bg-destructive/[0.05]" },
  "insufficient-data": { en: "Needs review", ar: "يحتاج مراجعة", variant: "outline", tone: "text-muted-foreground", surface: "border-border/70 bg-muted/40" },
};

export const CRITERION_ICONS: Record<CriterionKey, ComponentType<LucideProps>> = {
  category: Car,
  size: Ruler,
  weight: Feather,
  material: Layers,
  breakRisk: ShieldCheck,
  returnRisk: RotateCcw,
  price: Tag,
  useCaseClarity: Eye,
  competition: Swords,
  demand: TrendingUp,
  sourcing: Truck,
  bundle: Package,
};

export function bandTone(band: CriterionBand): { text: string; bg: string; dot: string } {
  switch (band) {
    case "strong":
      return { text: "text-positive", bg: "bg-positive/12", dot: "bg-positive" };
    case "moderate":
      return { text: "text-confidence-medium", bg: "bg-confidence-medium/15", dot: "bg-confidence-medium" };
    case "weak":
      return { text: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" };
    default:
      return { text: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground/40" };
  }
}

export const WPS_CONFIDENCE_META: Record<WpsConfidence, { en: string; ar: string; cls: string; dot: string }> = {
  "user-confirmed": { en: "Confirmed by you", ar: "مؤكَّد منك", cls: "text-brand-foreground bg-accent", dot: "bg-brand" },
  high: { en: "Verified fact", ar: "حقيقة مؤكدة", cls: "text-confidence-high bg-confidence-high/12", dot: "bg-confidence-high" },
  medium: { en: "Relative", ar: "نسبي", cls: "text-confidence-medium bg-confidence-medium/15", dot: "bg-confidence-medium" },
  low: { en: "Estimated", ar: "تقديري", cls: "text-confidence-low bg-confidence-low/15", dot: "bg-confidence-low" },
};

/** How a criterion's value is sourced — drives the legend + per-row icon meaning. */
export const SIGNAL_META: Record<
  "fact" | "ordinal" | "estimate",
  { en: string; ar: string }
> = {
  fact: { en: "Measured fact", ar: "حقيقة مقيسة" },
  ordinal: { en: "Relative signal", ar: "إشارة نسبية" },
  estimate: { en: "Inferred estimate", ar: "تقدير مُستنتج" },
};
