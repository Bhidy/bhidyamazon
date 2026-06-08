"use client";

import { useState } from "react";
import {
  Calculator,
  Check,
  ChevronDown,
  ExternalLink,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductThumb } from "@/components/app/product-thumb";
import { useLocale } from "@/lib/locale";
import { useWpsOverrides } from "@/lib/wps-overrides";
import { WINNING_SCORE_CONFIG } from "@/lib/winning-score";
import { formatEgp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CriterionKey, CriterionScore, Product, WinningScore } from "@/lib/types";
import {
  bandTone,
  CRITERION_ICONS,
  SIGNAL_META,
  VERDICT_META,
  WPS_CONFIDENCE_META,
} from "./wps-display";

const CFG_BY_KEY = Object.fromEntries(WINNING_SCORE_CONFIG.criteria.map((c) => [c.key, c]));

/** AliExpress search deep-link from a cleaned product title (assisted sourcing). */
function sourcingUrl(p: Product): string {
  const term = (p.titleEn || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)
    .join(" ");
  return `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(term || "car accessory")}`;
}

export function OpportunityCard({
  product,
  score,
  rank,
}: {
  product: Product;
  score: WinningScore;
  rank: number;
}) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const { confirm, setOverride, clearOverride } = useWpsOverrides();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CriterionKey | null>(null);
  const [draft, setDraft] = useState("");

  const v = VERDICT_META[score.verdict];
  const completenessPct = Math.round(score.completeness * 100);
  const confPct = Math.round(score.confidenceCoverage * 100);

  const startEdit = (key: CriterionKey, current: number | null) => {
    setEditing(key);
    setDraft(current != null ? String(current) : "");
  };
  const saveEdit = (key: CriterionKey) => {
    const n = Number(draft);
    if (Number.isFinite(n)) setOverride(product.asin, key, { subscore: Math.max(0, Math.min(100, n)), updatedAt: "" });
    setEditing(null);
  };

  return (
    <div className={cn("rounded-2xl border shadow-card transition-colors", v.surface)}>
      {/* ── Collapsed summary row ── */}
      <div className="flex items-start gap-3 p-3.5">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="grid size-6 place-items-center rounded-md bg-card text-xs font-semibold tabular-nums text-muted-foreground shadow-card">
            {rank}
          </span>
        </div>
        <ProductThumb product={product} size={52} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/products/${product.asin}`}
                className="line-clamp-2 text-sm font-semibold text-foreground hover:underline"
              >
                {product.titleEn}
              </Link>
              {product.titleAr ? (
                <p dir="rtl" className="line-clamp-1 font-arabic text-xs text-muted-foreground">
                  {product.titleAr}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {product.brand ? <span className="font-medium text-foreground/80">{product.brand}</span> : null}
                {product.priceEgp != null ? <span className="tabular-nums">{formatEgp(product.priceEgp)}</span> : null}
                {product.rating != null ? <span className="tabular-nums">{product.rating}★ ({product.reviewCount ?? 0})</span> : null}
              </div>
            </div>

            {/* Score / verdict */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              {score.gated ? (
                <span className={cn("text-lg font-bold tabular-nums", v.tone)}>—</span>
              ) : (
                <span className={cn("text-2xl font-bold leading-none tabular-nums", v.tone)}>{score.score}</span>
              )}
              <Badge variant={v.variant} className="h-5">
                <span data-bi-en="">{v.en}</span>
                <span data-bi-ar="">{v.ar}</span>
              </Badge>
            </div>
          </div>

          {/* Completeness + confidence coverage */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Meter
              labelEn="Data completeness"
              labelAr="اكتمال البيانات"
              pct={completenessPct}
              tone={completenessPct >= 60 ? "bg-primary" : "bg-confidence-low"}
            />
            <Meter
              labelEn="Rests on facts"
              labelAr="مبني على حقائق"
              pct={confPct}
              tone="bg-confidence-high"
            />
          </div>

          {/* Criterion chip strip */}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {score.criteria.map((c) => (
              <CriterionChip key={c.key} c={c} isAr={isAr} />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="xs" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
              <span data-bi-en="">Breakdown</span>
              <span data-bi-ar="">التفاصيل</span>
            </Button>
            <Button
              variant="ghost"
              size="xs"
              nativeButton={false}
              render={
                <Link href={`/calculator?price=${product.priceEgp ?? ""}&category=${product.categoryNode}`} />
              }
            >
              <Calculator />
              <span data-bi-en="">Profit</span>
              <span data-bi-ar="">الربح</span>
            </Button>
            <Button
              variant="ghost"
              size="xs"
              nativeButton={false}
              render={<a href={sourcingUrl(product)} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink />
              <span data-bi-en="">Source it</span>
              <span data-bi-ar="">المصدر</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Expanded breakdown ── */}
      {open ? (
        <div className="border-t border-border/60 px-3.5 py-3">
          {score.gated ? (
            <p className="mb-2.5 rounded-lg border border-confidence-low/30 bg-confidence-low/[0.06] px-3 py-2 text-xs text-muted-foreground">
              <span data-bi-en="">{score.provenance.note}</span>
              <span data-bi-ar="">بيانات غير كافية ({completenessPct}%) — راجع المعايير الناقصة يدويًا أو أدخل قيمها.</span>
            </p>
          ) : null}
          <ul className="space-y-1.5">
            {score.criteria.map((c) => (
              <CriterionRow
                key={c.key}
                c={c}
                isAr={isAr}
                editing={editing === c.key}
                draft={draft}
                onDraft={setDraft}
                onStartEdit={() => startEdit(c.key, c.subscore)}
                onSave={() => saveEdit(c.key)}
                onCancel={() => setEditing(null)}
                onConfirm={() => confirm(product.asin, c.key)}
                onReset={() => clearOverride(product.asin, c.key)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Meter({
  labelEn,
  labelAr,
  pct,
  tone,
}: {
  labelEn: string;
  labelAr: string;
  pct: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          <span data-bi-en="">{labelEn}</span>
          <span data-bi-ar="">{labelAr}</span>
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CriterionChip({ c, isAr }: { c: CriterionScore; isAr: boolean }) {
  const t = bandTone(c.band);
  const cfg = CFG_BY_KEY[c.key];
  const Icon = CRITERION_ICONS[c.key];
  const label = isAr ? cfg?.labelAr : cfg?.labelEn;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md",
              t.bg,
              t.text,
              c.overridden && "ring-1 ring-brand ring-offset-1 ring-offset-card",
              !c.available && "opacity-45",
            )}
          />
        }
        aria-label={label}
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">
        <div className="text-xs font-semibold">
          {label}
          {": "}
          {c.available ? c.subscore : isAr ? "غير متاح" : "n/a"}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{c.reason}</div>
      </TooltipContent>
    </Tooltip>
  );
}

function CriterionRow({
  c,
  isAr,
  editing,
  draft,
  onDraft,
  onStartEdit,
  onSave,
  onCancel,
  onConfirm,
  onReset,
}: {
  c: CriterionScore;
  isAr: boolean;
  editing: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const t = bandTone(c.band);
  const cfg = CFG_BY_KEY[c.key];
  const conf = WPS_CONFIDENCE_META[c.confidence];
  const sig = SIGNAL_META[c.signal];
  const label = isAr ? cfg?.labelAr : cfg?.labelEn;

  return (
    <li className="rounded-lg border border-border/50 bg-card/60 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", t.dot)} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{label}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", conf.cls)}>
          <span className={cn("size-1.5 rounded-full", conf.dot)} />
          <span data-bi-en="">{conf.en}</span>
          <span data-bi-ar="">{conf.ar}</span>
        </span>
        <span className={cn("w-8 shrink-0 text-right text-xs font-semibold tabular-nums", t.text)}>
          {c.available ? c.subscore : "—"}
        </span>
      </div>

      <p className="mt-1 ps-4 text-[11px] leading-snug text-muted-foreground">
        <span className="text-foreground/60">[{isAr ? sig.ar : sig.en}]</span> {c.reason}
      </p>

      {/* Override controls */}
      <div className="mt-1.5 ps-4">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={100}
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              className="h-7 w-20 rounded-lg text-xs tabular-nums"
              placeholder="0–100"
              aria-label={isAr ? "قيمة المعيار" : "Criterion value"}
            />
            <Button variant="brand" size="xs" onClick={onSave}>
              <Check />
              <span data-bi-en="">Save</span>
              <span data-bi-ar="">حفظ</span>
            </Button>
            <Button variant="ghost" size="xs" onClick={onCancel} aria-label={isAr ? "إلغاء" : "Cancel"}>
              <X />
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {c.available && !c.overridden ? (
              <Button variant="ghost" size="xs" onClick={onConfirm}>
                <Check />
                <span data-bi-en="">Confirm</span>
                <span data-bi-ar="">تأكيد</span>
              </Button>
            ) : null}
            <Button variant="ghost" size="xs" onClick={onStartEdit}>
              <Pencil />
              <span data-bi-en="">{c.available ? "Override" : "Set value"}</span>
              <span data-bi-ar="">{c.available ? "تعديل" : "إدخال قيمة"}</span>
            </Button>
            {c.overridden ? (
              <Button variant="ghost" size="xs" onClick={onReset}>
                <RotateCcw />
                <span data-bi-en="">Reset</span>
                <span data-bi-ar="">إعادة</span>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}
