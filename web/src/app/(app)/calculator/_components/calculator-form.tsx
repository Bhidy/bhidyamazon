"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Coins,
  Info,
  Package,
  ReceiptText,
  Scale,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ConfidenceBadge } from "@/components/app/confidence";
import { computeProfit, DEFAULT_FEE_SCHEDULE } from "@/lib/fees";
import { CATEGORIES, CATEGORY_BY_NODE, DISCLOSURE } from "@/lib/constants";
import { formatEgp, formatDate, formatPct } from "@/lib/format";
import type {
  CalculatorInput,
  FulfillmentMethod,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/* ───────────────────────── small field helpers ─────────────────────────── */

/** Label + optional info tooltip + suffix-decorated numeric input. */
function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  min = 0,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  placeholder?: string;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        {hint ? (
          <Tooltip>
            <TooltipTrigger
              className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`About ${label}`}
            >
              <Info className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">{hint}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 rounded-xl pe-12 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-xs font-medium text-muted-foreground">
          EGP
        </span>
      </div>
    </div>
  );
}

/** One row of the results breakdown table. `tone` colors the amount. */
function LineItem({
  label,
  value,
  sub,
  tone = "default",
  strong = false,
  indent = false,
}: {
  label: React.ReactNode;
  value: number;
  sub?: string;
  tone?: "default" | "muted" | "negative" | "positive";
  strong?: boolean;
  indent?: boolean;
}) {
  const toneCls =
    tone === "negative"
      ? "text-negative"
      : tone === "positive"
        ? "text-positive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-1.5 text-sm",
        indent && "pl-3",
      )}
    >
      <div className="min-w-0">
        <span className={cn(strong ? "font-medium text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
        {sub ? <span className="ml-1.5 text-xs text-muted-foreground/80">{sub}</span> : null}
      </div>
      <span className={cn("shrink-0 tabular-nums", strong && "font-semibold", toneCls)}>
        {value < 0 ? "−" : ""}
        {formatEgp(Math.abs(value))}
      </span>
    </div>
  );
}

/* ─────────────────────────── parse helper ──────────────────────────────── */

/** Coerce a text field to a non-negative number; blank/invalid → 0. */
function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ──────────────────────────── the form ─────────────────────────────────── */

export function CalculatorForm({
  initialPrice,
  initialCategory,
}: {
  initialPrice?: number;
  initialCategory: string;
}) {
  // Raw text state keeps the inputs honest (an empty box stays empty, never "0").
  const [sellPrice, setSellPrice] = useState(initialPrice != null ? String(initialPrice) : "499");
  const [cogs, setCogs] = useState("180");
  const [categoryNode, setCategoryNode] = useState(initialCategory);
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("fba");
  const [fbaSizeTier, setFbaSizeTier] = useState(DEFAULT_FEE_SCHEDULE.fbaLadder[0].sizeTier);
  const [inbound, setInbound] = useState("15");
  const [misc, setMisc] = useState("0");
  const [vatRegistered, setVatRegistered] = useState(true);

  const input: CalculatorInput = useMemo(
    () => ({
      sellPriceEgp: num(sellPrice),
      costOfGoodsEgp: num(cogs),
      categoryNode,
      fulfillment,
      fbaSizeTier: fulfillment === "fba" ? fbaSizeTier : undefined,
      inboundShippingEgp: num(inbound),
      miscCostEgp: num(misc),
      vatRegistered,
    }),
    [sellPrice, cogs, categoryNode, fulfillment, fbaSizeTier, inbound, misc, vatRegistered],
  );

  const result = useMemo(() => computeProfit(input), [input]);

  const category = CATEGORY_BY_NODE[categoryNode];
  const vatRatePct = Math.round(DEFAULT_FEE_SCHEDULE.vatRate * 100);
  const profitable = result.netProfitEgp > 0;
  const breakEvenKnown = Number.isFinite(result.breakEvenPriceEgp);

  const profitTone = profitable
    ? "text-positive"
    : result.netProfitEgp < 0
      ? "text-negative"
      : "text-foreground";

  // Tonal surface for the headline result: lime highlight when profitable,
  // negative tint on a loss, neutral at break-even.
  const headlineSurface = profitable
    ? "border-brand/40 bg-accent shadow-brand/40"
    : result.netProfitEgp < 0
      ? "border-negative/30 bg-negative/[0.06]"
      : "border-border/70 bg-muted/40";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ───────────────────────── Inputs column ──────────────────────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground"
            >
              <Coins className="size-4.5" />
            </span>
            <CardTitle className="text-base">Deal inputs</CardTitle>
          </div>
          <CardDescription>
            Enter the consumer price (what the shopper pays) and your landed costs.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              id="sell-price"
              label="Sell price"
              value={sellPrice}
              onChange={setSellPrice}
              placeholder="0"
              hint="The listed consumer price on amazon.eg. It is VAT-inclusive — what the shopper actually pays at checkout."
            />
            <MoneyField
              id="cogs"
              label="Cost of goods"
              value={cogs}
              onChange={setCogs}
              placeholder="0"
              hint="What you pay your supplier or the local shop per unit, before shipping it to Amazon."
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryNode}
              onValueChange={(next) => setCategoryNode(next ?? CATEGORIES[0].nodeId)}
            >
              <SelectTrigger
                id="category"
                className="h-10 w-full rounded-xl"
                aria-label="Product category"
              >
                <SelectValue>
                  {(v: string | null) => {
                    const c = CATEGORY_BY_NODE[v ?? categoryNode];
                    return (
                      <span className="flex items-center gap-2">
                        <span>{c?.nameEn}</span>
                        {c ? (
                          <span dir="rtl" className="font-arabic text-xs text-muted-foreground">
                            {c.nameAr}
                          </span>
                        ) : null}
                      </span>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.nodeId} value={c.nodeId}>
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>{c.nameEn}</span>
                      <span dir="rtl" className="font-arabic text-xs text-muted-foreground">
                        {c.nameAr}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sets the referral-fee rate. {category?.nameEn} is currently{" "}
              <span className="font-medium text-foreground tabular-nums">
                {referralLabel(categoryNode)}
              </span>
              .
            </p>
          </div>

          {/* Fulfillment */}
          <div className="space-y-1.5">
            <Label>Fulfillment</Label>
            <Tabs
              value={fulfillment}
              onValueChange={(v) => setFulfillment((v as FulfillmentMethod) ?? "fba")}
            >
              <TabsList className="h-10 w-full rounded-full bg-muted p-1">
                <TabsTrigger
                  value="fba"
                  className="flex-1 rounded-full data-active:bg-brand data-active:text-brand-foreground data-active:shadow-sm"
                >
                  <Package className="size-3.5" />
                  FBA
                </TabsTrigger>
                <TabsTrigger
                  value="fbm"
                  className="flex-1 rounded-full data-active:bg-brand data-active:text-brand-foreground data-active:shadow-sm"
                >
                  <Wallet className="size-3.5" />
                  FBM
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {fulfillment === "fba"
                ? "Fulfilled by Amazon — adds a per-unit fulfillment fee from the size ladder."
                : "Fulfilled by you (merchant) — no Amazon fulfillment fee; you cover delivery yourself."}
            </p>
          </div>

          {/* FBA size tier — only when FBA */}
          {fulfillment === "fba" ? (
            <div className="space-y-1.5">
              <Label htmlFor="fba-tier">FBA size tier</Label>
              <Select
                value={fbaSizeTier}
                onValueChange={(next) =>
                  setFbaSizeTier(next ?? DEFAULT_FEE_SCHEDULE.fbaLadder[0].sizeTier)
                }
              >
                <SelectTrigger
                  id="fba-tier"
                  className="h-10 w-full rounded-xl"
                  aria-label="FBA size tier"
                >
                  <SelectValue>
                    {(v: string | null) =>
                      DEFAULT_FEE_SCHEDULE.fbaLadder.find((r) => r.sizeTier === (v ?? fbaSizeTier))
                        ?.label ?? "Select a size tier"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_FEE_SCHEDULE.fbaLadder.map((rung) => (
                    <SelectItem key={rung.sizeTier} value={rung.sizeTier}>
                      <span className="flex w-full items-center justify-between gap-4">
                        <span>{rung.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          ≤ {rung.maxWeightKg} kg
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Fee steps up for items priced over{" "}
                <span className="tabular-nums">
                  {formatEgp(DEFAULT_FEE_SCHEDULE.fbaPriceBandEgp)}
                </span>
                .
              </p>
            </div>
          ) : null}

          {/* Extra costs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              id="inbound"
              label="Inbound shipping"
              value={inbound}
              onChange={setInbound}
              placeholder="0"
              hint="Your cost to get one unit to Amazon's fulfillment center (or to the customer, if FBM)."
            />
            <MoneyField
              id="misc"
              label="Misc cost"
              value={misc}
              onChange={setMisc}
              placeholder="0"
              hint="Anything else per unit: prep, packaging, returns allowance, ad cost amortised over a unit, etc."
            />
          </div>

          <Separator />

          {/* VAT registration */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="vat-registered" className="cursor-pointer">
                VAT-registered seller
              </Label>
              <p className="text-xs text-muted-foreground">
                Registered: revenue = price ÷ {(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}, and the
                {" "}
                {vatRatePct}% VAT Amazon charges on its fees is reclaimable. Unregistered: you keep the
                full price but that fee-VAT is a real cost.
              </p>
            </div>
            <Switch
              id="vat-registered"
              checked={vatRegistered}
              onCheckedChange={setVatRegistered}
              aria-label="VAT-registered seller"
            />
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────── Results column ─────────────────────────── */}
      <div className="lg:sticky lg:top-6">
        <Card className="gap-0">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground"
                >
                  <ReceiptText className="size-4.5" />
                </span>
                <CardTitle className="text-base">Per-unit result</CardTitle>
              </div>
              <ConfidenceBadge confidence="medium" note={DISCLOSURE.estimatedFeesEn} />
            </div>
            <CardDescription>
              Net profit on one unit after Amazon&apos;s fees and {vatRatePct}% VAT.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {/* Headline numbers */}
            <div className={cn("rounded-2xl border p-4 transition-colors", headlineSurface)}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Net profit / unit
                  </div>
                  <div className={cn("mt-0.5 text-4xl font-bold tracking-tight tabular-nums", profitTone)}>
                    {result.netProfitEgp < 0 ? "−" : ""}
                    {formatEgp(Math.abs(result.netProfitEgp))}
                  </div>
                </div>
                <Badge
                  variant={profitable ? "brand" : result.netProfitEgp < 0 ? "destructive" : "outline"}
                  className="h-6 px-2.5"
                >
                  {profitable ? "Profitable" : result.netProfitEgp < 0 ? "Loss" : "Break-even"}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-card">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Scale className="size-3.5" />
                    Margin
                  </div>
                  <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", profitTone)}>
                    {formatPct(result.marginPct, "en", { decimals: 1, signed: result.marginPct < 0 })}
                  </div>
                  <div className="text-[11px] text-muted-foreground">of sell price</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-card">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Coins className="size-3.5" />
                    ROI
                  </div>
                  <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", profitTone)}>
                    {result.roiPct === 0 && input.costOfGoodsEgp === 0
                      ? "—"
                      : formatPct(result.roiPct, "en", { decimals: 1, signed: result.roiPct < 0 })}
                  </div>
                  <div className="text-[11px] text-muted-foreground">on cash invested</div>
                </div>
              </div>
            </div>

            {/* Line-item breakdown */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Breakdown</h3>
                {vatRegistered ? (
                  <span className="text-[11px] text-muted-foreground">VAT-registered</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Not VAT-registered</span>
                )}
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-1 divide-y divide-border/60">
                <LineItem
                  label="Net revenue"
                  sub={vatRegistered ? `price ÷ ${(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}` : "price (no VAT strip)"}
                  value={result.netRevenueEgp}
                  tone="positive"
                  strong
                />
                <LineItem label="Referral fee" value={-result.referralFeeEgp} tone="negative" />
                <LineItem
                  label={`Referral VAT (${vatRatePct}%)`}
                  value={-result.referralVatEgp}
                  tone="negative"
                  indent
                  sub={vatRegistered ? "reclaimed" : undefined}
                />
                {fulfillment === "fba" ? (
                  <>
                    <LineItem label="FBA fee" value={-result.fbaFeeEgp} tone="negative" />
                    <LineItem
                      label={`FBA VAT (${vatRatePct}%)`}
                      value={-result.fbaVatEgp}
                      tone="negative"
                      indent
                      sub={vatRegistered ? "reclaimed" : undefined}
                    />
                  </>
                ) : null}
                {vatRegistered && result.reclaimableVatEgp > 0 ? (
                  <LineItem
                    label="Reclaimable fee VAT"
                    value={result.reclaimableVatEgp}
                    tone="positive"
                    indent
                    sub="input credit"
                  />
                ) : null}
                <LineItem label="Cost of goods" value={-result.costOfGoodsEgp} tone="negative" />
                {result.inboundShippingEgp > 0 ? (
                  <LineItem label="Inbound shipping" value={-result.inboundShippingEgp} tone="negative" />
                ) : null}
                {result.miscCostEgp > 0 ? (
                  <LineItem label="Misc cost" value={-result.miscCostEgp} tone="negative" />
                ) : null}
                <LineItem label="Total cost" value={-result.totalCostEgp} tone="muted" strong />
                <LineItem label="Net profit" value={result.netProfitEgp} tone={profitable ? "positive" : "negative"} strong />
              </div>
            </div>

            {/* Break-even */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">Break-even price</span>
                <Tooltip>
                  <TooltipTrigger
                    className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="About break-even price"
                  >
                    <Info className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">
                    The lowest consumer price at which this unit stops losing money, holding your
                    costs and the current fee schedule fixed.
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {breakEvenKnown ? formatEgp(result.breakEvenPriceEgp) : "—"}
              </span>
            </div>

            {/* Warnings */}
            {result.warnings.length ? (
              <div className="space-y-2">
                {result.warnings.map((w, i) => {
                  const isLoss = w.toLowerCase().includes("loss");
                  return (
                    <Alert
                      key={i}
                      variant={isLoss ? "destructive" : "default"}
                      className={cn(!isLoss && "border-confidence-low/30")}
                    >
                      {isLoss ? (
                        <AlertTriangle className="size-4" />
                      ) : (
                        <Info className="size-4 text-confidence-low" />
                      )}
                      <AlertDescription className={cn(isLoss && "text-destructive/90")}>
                        {w}
                      </AlertDescription>
                    </Alert>
                  );
                })}
              </div>
            ) : null}

            {/* Honest-data footer */}
            <div className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <ReceiptText className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  The consumer price is VAT-inclusive: a VAT-registered seller&apos;s revenue is{" "}
                  <span className="font-medium text-foreground">price ÷ {(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}</span>,
                  and Amazon adds {vatRatePct}% VAT on top of its referral and FBA fees.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  {DISCLOSURE.estimatedFeesEn} Schedule as of{" "}
                  <span className="tabular-nums">{formatDate(DEFAULT_FEE_SCHEDULE.asOf)}</span>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────── derived display copy ────────────────────────── */

/** Human-readable referral rate for the active category (handles tiered rules). */
function referralLabel(categoryNode: string): string {
  const rule =
    DEFAULT_FEE_SCHEDULE.referral.find((r) => r.categoryNode === categoryNode) ??
    DEFAULT_FEE_SCHEDULE.referral.find((r) => r.categoryNode === "home");
  if (!rule) return "—";
  if (rule.tiers.length === 1) {
    return `${Math.round(rule.tiers[0].rate * 100)}% referral`;
  }
  const rates = rule.tiers.map((t) => `${Math.round(t.rate * 100)}%`);
  return `${rates.join("/")} tiered referral`;
}
