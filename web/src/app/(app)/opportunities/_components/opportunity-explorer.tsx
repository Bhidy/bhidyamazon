"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { useWpsOverrides } from "@/lib/wps-overrides";
import { computeWinningScore, WINNING_SCORE_CONFIG, type ScoreContext } from "@/lib/winning-score";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product, WinningScore } from "@/lib/types";
import { OpportunityCard } from "./opportunity-card";

const num = (s: string): number | null => {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

function longestEdge(p: Product): number | null {
  const d = p.itemDimensionsCm;
  return d ? Math.max(d.l, d.w, d.h) : null;
}

export function OpportunityExplorer({
  products,
  context,
}: {
  products: Product[];
  context: ScoreContext;
}) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const { overrides } = useWpsOverrides();

  const [maxPrice, setMaxPrice] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [minScore, setMinScore] = useState("");
  const [hideModelFit, setHideModelFit] = useState(false);
  const [showInsufficient, setShowInsufficient] = useState(true);

  // Re-score whenever overrides change — the engine is pure, so this is cheap.
  const scored = useMemo(
    () =>
      products.map((product) => ({
        product,
        score: computeWinningScore(product, overrides, WINNING_SCORE_CONFIG, context),
      })),
    [products, context, overrides],
  );

  const stats = useMemo(() => {
    const winners = scored.filter((r) => r.score.verdict === "winner").length;
    const promising = scored.filter((r) => r.score.verdict === "promising").length;
    const needs = scored.filter((r) => r.score.gated).length;
    return { total: scored.length, winners, promising, needs };
  }, [scored]);

  const filtered = useMemo(() => {
    const mp = num(maxPrice);
    const ms = num(maxSize);
    const min = num(minScore);
    const rows = scored.filter(({ product, score }) => {
      if (!showInsufficient && score.gated) return false;
      if (min != null && !score.gated && (score.score ?? 0) < min) return false;
      if (mp != null && product.priceEgp != null && product.priceEgp > mp) return false;
      if (ms != null) {
        const edge = longestEdge(product);
        if (edge != null && edge > ms) return false; // unknown size is kept (honest)
      }
      if (hideModelFit) {
        const rr = score.criteria.find((c) => c.key === "returnRisk");
        if (rr?.reason.includes("model/year-specific")) return false;
      }
      return true;
    });
    rows.sort((a, b) => {
      if (a.score.gated !== b.score.gated) return a.score.gated ? 1 : -1;
      if (!a.score.gated && !b.score.gated) return (b.score.score ?? 0) - (a.score.score ?? 0);
      return b.score.completeness - a.score.completeness;
    });
    return rows;
  }, [scored, maxPrice, maxSize, minScore, hideModelFit, showInsufficient]);

  const resetFilters = () => {
    setMaxPrice("");
    setMaxSize("");
    setMinScore("");
    setHideModelFit(false);
    setShowInsufficient(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat icon={<Trophy className="size-4" />} value={stats.winners} labelEn="Winners" labelAr="رابحة" tone="text-positive" />
        <Stat icon={<Sparkles className="size-4" />} value={stats.promising} labelEn="Promising" labelAr="واعدة" tone="text-brand-foreground" />
        <Stat value={stats.total} labelEn="Candidates" labelAr="مرشّحة" tone="text-foreground" />
        <Stat value={stats.needs} labelEn="Needs review" labelAr="تحتاج مراجعة" tone="text-muted-foreground" />
      </div>

      {/* Filters */}
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-wrap items-end gap-x-4 gap-y-3 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            <span data-bi-en="">Filters</span>
            <span data-bi-ar="">المرشّحات</span>
          </div>
          <FilterNum id="f-price" labelEn="Max price (EGP)" labelAr="أقصى سعر" value={maxPrice} onChange={setMaxPrice} />
          <FilterNum id="f-size" labelEn="Max size (cm)" labelAr="أقصى حجم (سم)" value={maxSize} onChange={setMaxSize} />
          <FilterNum id="f-score" labelEn="Min score" labelAr="أدنى نتيجة" value={minScore} onChange={setMinScore} />
          <FilterSwitch id="f-fit" labelEn="Hide model-fit items" labelAr="إخفاء المرتبطة بموديل" checked={hideModelFit} onChange={setHideModelFit} />
          <FilterSwitch id="f-insuff" labelEn="Show needs-review" labelAr="إظهار التي تحتاج مراجعة" checked={showInsufficient} onChange={setShowInsufficient} />
          <Button variant="ghost" size="sm" onClick={resetFilters} className="ms-auto">
            <span data-bi-en="">Reset</span>
            <span data-bi-ar="">إعادة ضبط</span>
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        <span data-bi-en="">
          <span className="font-semibold tabular-nums text-foreground">{formatNumber(filtered.length)}</span> candidate
          {filtered.length === 1 ? "" : "s"} scored against the{" "}
          <span className="font-medium text-foreground">{WINNING_SCORE_CONFIG.presetLabelEn}</span> preset.
        </span>
        <span data-bi-ar="">
          <span className="font-semibold tabular-nums text-foreground">{formatNumber(filtered.length)}</span> مرشّح مُقيّم وفق إعداد{" "}
          <span className="font-medium text-foreground">{WINNING_SCORE_CONFIG.presetLabelAr}</span>.
        </span>
      </p>

      {filtered.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map(({ product, score }, i) => (
            <OpportunityCard key={product.asin} product={product} score={score} rank={i + 1} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card py-14 text-center text-sm text-muted-foreground shadow-card">
          <span data-bi-en="">No candidates match these filters.</span>
          <span data-bi-ar="">لا مرشّحات تطابق هذه المرشّحات.</span>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  labelEn,
  labelAr,
  tone,
}: {
  icon?: React.ReactNode;
  value: number;
  labelEn: string;
  labelAr: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span data-bi-en="">{labelEn}</span>
        <span data-bi-ar="">{labelAr}</span>
      </div>
      <div className={cn("mt-0.5 text-2xl font-bold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

function FilterNum({
  id,
  labelEn,
  labelAr,
  value,
  onChange,
}: {
  id: string;
  labelEn: string;
  labelAr: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground">
        <span data-bi-en="">{labelEn}</span>
        <span data-bi-ar="">{labelAr}</span>
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="h-8 w-28 rounded-lg text-xs tabular-nums"
      />
    </div>
  );
}

function FilterSwitch({
  id,
  labelEn,
  labelAr,
  checked,
  onChange,
}: {
  id: string;
  labelEn: string;
  labelAr: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 pb-1.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-[11px] text-muted-foreground">
        <span data-bi-en="">{labelEn}</span>
        <span data-bi-ar="">{labelAr}</span>
      </Label>
    </div>
  );
}
