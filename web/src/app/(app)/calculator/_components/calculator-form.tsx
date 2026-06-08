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
import { useLocale } from "@/lib/locale";
import type {
  CalculatorInput,
  FulfillmentMethod,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/* ───────────────────────── small field helpers ─────────────────────────── */

function MoneyField({
  id,
  labelEn,
  labelAr,
  value,
  onChange,
  hintEn,
  hintAr,
  placeholder,
  min = 0,
  isAr,
}: {
  id: string;
  labelEn: string;
  labelAr: string;
  value: string;
  onChange: (next: string) => void;
  hintEn?: string;
  hintAr?: string;
  placeholder?: string;
  min?: number;
  isAr: boolean;
}) {
  const label = isAr ? labelAr : labelEn;
  const hint = isAr ? hintAr : hintEn;
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

function LineItem({
  labelEn,
  labelAr,
  value,
  sub,
  tone = "default",
  strong = false,
  indent = false,
  isAr,
}: {
  labelEn: React.ReactNode;
  labelAr: React.ReactNode;
  value: number;
  sub?: string;
  tone?: "default" | "muted" | "negative" | "positive";
  strong?: boolean;
  indent?: boolean;
  isAr: boolean;
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
          {isAr ? labelAr : labelEn}
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
  const { locale } = useLocale();
  const isAr = locale === "ar";

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
            <CardTitle className="text-base">
              {isAr ? "بيانات الصفقة" : "Deal inputs"}
            </CardTitle>
          </div>
          <CardDescription>
            {isAr
              ? "أدخل سعر المستهلك (ما يدفعه المتسوق) وتكاليفك الإجمالية."
              : "Enter the consumer price (what the shopper pays) and your landed costs."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              id="sell-price"
              labelEn="Sell price"
              labelAr="سعر البيع"
              value={sellPrice}
              onChange={setSellPrice}
              placeholder="0"
              hintEn="The listed consumer price on amazon.eg. It is VAT-inclusive — what the shopper actually pays at checkout."
              hintAr="السعر المدرج للمستهلك على amazon.eg. يشمل ضريبة القيمة المضافة — ما يدفعه المتسوق فعلياً عند الدفع."
              isAr={isAr}
            />
            <MoneyField
              id="cogs"
              labelEn="Cost of goods"
              labelAr="تكلفة البضاعة"
              value={cogs}
              onChange={setCogs}
              placeholder="0"
              hintEn="What you pay your supplier or the local shop per unit, before shipping it to Amazon."
              hintAr="ما تدفعه لمورّدك أو المتجر المحلي لكل وحدة، قبل شحنها إلى Amazon."
              isAr={isAr}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">{isAr ? "الفئة" : "Category"}</Label>
            <Select
              value={categoryNode}
              onValueChange={(next) => setCategoryNode(next ?? CATEGORIES[0].nodeId)}
            >
              <SelectTrigger
                id="category"
                className="h-10 w-full rounded-xl"
                aria-label={isAr ? "فئة المنتج" : "Product category"}
              >
                <SelectValue>
                  {(v: string | null) => {
                    const c = CATEGORY_BY_NODE[v ?? categoryNode];
                    return (
                      <span className="flex items-center gap-2">
                        <span>{isAr ? c?.nameAr : c?.nameEn}</span>
                        {c ? (
                          <span dir={isAr ? "ltr" : "rtl"} className="font-arabic text-xs text-muted-foreground">
                            {isAr ? c.nameEn : c.nameAr}
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
                      <span>{isAr ? c.nameAr : c.nameEn}</span>
                      <span dir={isAr ? "ltr" : "rtl"} className="font-arabic text-xs text-muted-foreground">
                        {isAr ? c.nameEn : c.nameAr}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? <>يحدد نسبة رسوم الإحالة. {category?.nameAr} حالياً <span className="font-medium text-foreground tabular-nums">{referralLabel(categoryNode)}</span>.</>
                : <>Sets the referral-fee rate. {category?.nameEn} is currently <span className="font-medium text-foreground tabular-nums">{referralLabel(categoryNode)}</span>.</>
              }
            </p>
          </div>

          {/* Fulfillment */}
          <div className="space-y-1.5">
            <Label>{isAr ? "طريقة التوصيل" : "Fulfillment"}</Label>
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
                ? (isAr ? "تلبية بواسطة Amazon — تضيف رسوم تلبية لكل وحدة من جدول الأحجام." : "Fulfilled by Amazon — adds a per-unit fulfillment fee from the size ladder.")
                : (isAr ? "تلبية بواسطتك (التاجر) — لا رسوم تلبية من Amazon؛ أنت تتولى التوصيل." : "Fulfilled by you (merchant) — no Amazon fulfillment fee; you cover delivery yourself.")}
            </p>
          </div>

          {/* FBA size tier */}
          {fulfillment === "fba" ? (
            <div className="space-y-1.5">
              <Label htmlFor="fba-tier">{isAr ? "حجم FBA" : "FBA size tier"}</Label>
              <Select
                value={fbaSizeTier}
                onValueChange={(next) =>
                  setFbaSizeTier(next ?? DEFAULT_FEE_SCHEDULE.fbaLadder[0].sizeTier)
                }
              >
                <SelectTrigger
                  id="fba-tier"
                  className="h-10 w-full rounded-xl"
                  aria-label={isAr ? "حجم FBA" : "FBA size tier"}
                >
                  <SelectValue>
                    {(v: string | null) =>
                      DEFAULT_FEE_SCHEDULE.fbaLadder.find((r) => r.sizeTier === (v ?? fbaSizeTier))
                        ?.label ?? (isAr ? "اختر حجماً" : "Select a size tier")
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
                {isAr
                  ? <>ترتفع الرسوم للمنتجات التي يتجاوز سعرها <span className="tabular-nums">{formatEgp(DEFAULT_FEE_SCHEDULE.fbaPriceBandEgp)}</span>.</>
                  : <>Fee steps up for items priced over <span className="tabular-nums">{formatEgp(DEFAULT_FEE_SCHEDULE.fbaPriceBandEgp)}</span>.</>
                }
              </p>
            </div>
          ) : null}

          {/* Extra costs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              id="inbound"
              labelEn="Inbound shipping"
              labelAr="شحن الوارد"
              value={inbound}
              onChange={setInbound}
              placeholder="0"
              hintEn="Your cost to get one unit to Amazon's fulfillment center (or to the customer, if FBM)."
              hintAr="تكلفتك لإيصال وحدة واحدة إلى مستودع Amazon (أو للعميل إذا كان FBM)."
              isAr={isAr}
            />
            <MoneyField
              id="misc"
              labelEn="Misc cost"
              labelAr="تكاليف أخرى"
              value={misc}
              onChange={setMisc}
              placeholder="0"
              hintEn="Anything else per unit: prep, packaging, returns allowance, ad cost amortised over a unit, etc."
              hintAr="أي شيء آخر لكل وحدة: تجهيز، تعبئة، مخصصات المرتجعات، تكلفة الإعلانات موزعة على الوحدة، إلخ."
              isAr={isAr}
            />
          </div>

          <Separator />

          {/* VAT registration */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="vat-registered" className="cursor-pointer">
                {isAr ? "بائع مسجل في ضريبة القيمة المضافة" : "VAT-registered seller"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? <>مسجل: الإيراد = السعر ÷ {(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}، وضريبة {vatRatePct}% التي تفرضها Amazon على رسومها قابلة للاسترداد. غير مسجل: تحتفظ بالسعر كاملاً لكن ضريبة الرسوم تكلفة حقيقية.</>
                  : <>Registered: revenue = price ÷ {(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}, and the {vatRatePct}% VAT Amazon charges on its fees is reclaimable. Unregistered: you keep the full price but that fee-VAT is a real cost.</>
                }
              </p>
            </div>
            <Switch
              id="vat-registered"
              checked={vatRegistered}
              onCheckedChange={setVatRegistered}
              aria-label={isAr ? "بائع مسجل في ضريبة القيمة المضافة" : "VAT-registered seller"}
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
                <CardTitle className="text-base">
                  {isAr ? "النتيجة لكل وحدة" : "Per-unit result"}
                </CardTitle>
              </div>
              <ConfidenceBadge confidence="medium" note={DISCLOSURE.estimatedFeesEn} />
            </div>
            <CardDescription>
              {isAr
                ? `صافي الربح لوحدة واحدة بعد رسوم Amazon و${vatRatePct}% ضريبة القيمة المضافة.`
                : `Net profit on one unit after Amazon's fees and ${vatRatePct}% VAT.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {/* Headline numbers */}
            <div className={cn("rounded-2xl border p-4 transition-colors", headlineSurface)}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {isAr ? "صافي الربح / وحدة" : "Net profit / unit"}
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
                  {profitable
                    ? (isAr ? "مربح" : "Profitable")
                    : result.netProfitEgp < 0
                      ? (isAr ? "خسارة" : "Loss")
                      : (isAr ? "نقطة التعادل" : "Break-even")}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-card">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Scale className="size-3.5" />
                    {isAr ? "الهامش" : "Margin"}
                  </div>
                  <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", profitTone)}>
                    {formatPct(result.marginPct, "en", { decimals: 1, signed: result.marginPct < 0 })}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {isAr ? "من سعر البيع" : "of sell price"}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-card">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Coins className="size-3.5" />
                    {isAr ? "عائد الاستثمار" : "ROI"}
                  </div>
                  <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", profitTone)}>
                    {result.roiPct === 0 && input.costOfGoodsEgp === 0
                      ? "—"
                      : formatPct(result.roiPct, "en", { decimals: 1, signed: result.roiPct < 0 })}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {isAr ? "على رأس المال" : "on cash invested"}
                  </div>
                </div>
              </div>
            </div>

            {/* Line-item breakdown */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  {isAr ? "التفصيل" : "Breakdown"}
                </h3>
                {vatRegistered ? (
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "مسجل ضريبياً" : "VAT-registered"}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "غير مسجل ضريبياً" : "Not VAT-registered"}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-1 divide-y divide-border/60">
                <LineItem
                  labelEn="Net revenue"
                  labelAr="الإيراد الصافي"
                  sub={vatRegistered ? `price ÷ ${(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}` : "price (no VAT strip)"}
                  value={result.netRevenueEgp}
                  tone="positive"
                  strong
                  isAr={isAr}
                />
                <LineItem labelEn="Referral fee" labelAr="رسوم الإحالة" value={-result.referralFeeEgp} tone="negative" isAr={isAr} />
                <LineItem
                  labelEn={`Referral VAT (${vatRatePct}%)`}
                  labelAr={`ضريبة الإحالة (${vatRatePct}%)`}
                  value={-result.referralVatEgp}
                  tone="negative"
                  indent
                  sub={vatRegistered ? (isAr ? "مستردة" : "reclaimed") : undefined}
                  isAr={isAr}
                />
                {fulfillment === "fba" ? (
                  <>
                    <LineItem labelEn="FBA fee" labelAr="رسوم FBA" value={-result.fbaFeeEgp} tone="negative" isAr={isAr} />
                    <LineItem
                      labelEn={`FBA VAT (${vatRatePct}%)`}
                      labelAr={`ضريبة FBA (${vatRatePct}%)`}
                      value={-result.fbaVatEgp}
                      tone="negative"
                      indent
                      sub={vatRegistered ? (isAr ? "مستردة" : "reclaimed") : undefined}
                      isAr={isAr}
                    />
                  </>
                ) : null}
                {vatRegistered && result.reclaimableVatEgp > 0 ? (
                  <LineItem
                    labelEn="Reclaimable fee VAT"
                    labelAr="ضريبة الرسوم المستردة"
                    value={result.reclaimableVatEgp}
                    tone="positive"
                    indent
                    sub={isAr ? "ائتمان مدخلات" : "input credit"}
                    isAr={isAr}
                  />
                ) : null}
                <LineItem labelEn="Cost of goods" labelAr="تكلفة البضاعة" value={-result.costOfGoodsEgp} tone="negative" isAr={isAr} />
                {result.inboundShippingEgp > 0 ? (
                  <LineItem labelEn="Inbound shipping" labelAr="شحن الوارد" value={-result.inboundShippingEgp} tone="negative" isAr={isAr} />
                ) : null}
                {result.miscCostEgp > 0 ? (
                  <LineItem labelEn="Misc cost" labelAr="تكاليف أخرى" value={-result.miscCostEgp} tone="negative" isAr={isAr} />
                ) : null}
                <LineItem labelEn="Total cost" labelAr="إجمالي التكاليف" value={-result.totalCostEgp} tone="muted" strong isAr={isAr} />
                <LineItem labelEn="Net profit" labelAr="صافي الربح" value={result.netProfitEgp} tone={profitable ? "positive" : "negative"} strong isAr={isAr} />
              </div>
            </div>

            {/* Break-even */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  {isAr ? "سعر نقطة التعادل" : "Break-even price"}
                </span>
                <Tooltip>
                  <TooltipTrigger
                    className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={isAr ? "حول سعر نقطة التعادل" : "About break-even price"}
                  >
                    <Info className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">
                    {isAr
                      ? "أقل سعر مستهلك لا تخسر عنده مع ثبات التكاليف وجدول الرسوم الحالي."
                      : "The lowest consumer price at which this unit stops losing money, holding your costs and the current fee schedule fixed."}
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
                  {isAr
                    ? <>سعر المستهلك يشمل ضريبة القيمة المضافة: إيراد البائع المسجل هو <span className="font-medium text-foreground">السعر ÷ {(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}</span>، وتضيف Amazon {vatRatePct}% ضريبة على رسوم الإحالة وFBA.</>
                    : <>The consumer price is VAT-inclusive: a VAT-registered seller&apos;s revenue is <span className="font-medium text-foreground">price ÷ {(1 + DEFAULT_FEE_SCHEDULE.vatRate).toFixed(2)}</span>, and Amazon adds {vatRatePct}% VAT on top of its referral and FBA fees.</>
                  }
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  {isAr ? DISCLOSURE.estimatedFeesEn : DISCLOSURE.estimatedFeesEn}{" "}
                  {isAr ? "الجدول اعتباراً من" : "Schedule as of"}{" "}
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
