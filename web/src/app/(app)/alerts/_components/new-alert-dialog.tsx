"use client";

import { useId, useMemo, useState } from "react";
import { BellPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlertRule } from "@/lib/types";
import { useLocale } from "@/lib/locale";

/** Minimal product shape needed to populate the picker (passed from the server). */
export interface AlertProductOption {
  asin: string;
  titleEn: string;
  titleAr?: string;
}

const RULES: {
  value: AlertRule;
  en: string;
  ar: string;
  helpEn: string;
  helpAr: string;
}[] = [
  {
    value: "price_drop",
    en: "Price drop",
    ar: "انخفاض السعر",
    helpEn: "Notify when the price falls by at least…",
    helpAr: "إشعار عند انخفاض السعر بمقدار لا يقل عن…",
  },
  {
    value: "bsr_rising",
    en: "Rising rank",
    ar: "ارتفاع الترتيب",
    helpEn: "Notify when rank improves over a window.",
    helpAr: "إشعار عند تحسن الترتيب خلال فترة زمنية.",
  },
  {
    value: "back_in_stock",
    en: "Back in stock",
    ar: "عودة للمخزون",
    helpEn: "Notify when an out-of-stock item returns.",
    helpAr: "إشعار عند عودة منتج نفد من المخزون.",
  },
  {
    value: "rating_drop",
    en: "Rating drop",
    ar: "انخفاض التقييم",
    helpEn: "Notify when the average rating falls by at least…",
    helpAr: "إشعار عند انخفاض متوسط التقييم بمقدار لا يقل عن…",
  },
];

const WINDOWS = ["24h", "7d", "30d"];

/** Which threshold control a rule needs: a percentage, a time window, or none. */
function thresholdKind(rule: AlertRule): "pct" | "window" | "none" {
  if (rule === "price_drop" || rule === "rating_drop") return "pct";
  if (rule === "bsr_rising") return "window";
  return "none";
}

/**
 * "New alert" dialog. Persisting alerts will be a Supabase RLS write; for now
 * this validates the form locally and confirms the (stubbed) creation with a
 * toast. The threshold control adapts to the chosen rule so the captured shape
 * mirrors the real `Alert.threshold` union (e.g. { pct } vs { window }).
 */
export function NewAlertDialog({ products }: { products: AlertProductOption[] }) {
  const [open, setOpen] = useState(false);
  const [asin, setAsin] = useState<string>("");
  const [rule, setRule] = useState<AlertRule>("price_drop");
  const [pct, setPct] = useState<string>("10");
  const [windowVal, setWindowVal] = useState<string>("7d");

  const { locale } = useLocale();
  const isAr = locale === "ar";

  const productId = useId();
  const ruleId = useId();
  const pctId = useId();
  const windowId = useId();

  const kind = thresholdKind(rule);
  const ruleMeta = useMemo(() => RULES.find((r) => r.value === rule)!, [rule]);
  const selected = useMemo(
    () => products.find((p) => p.asin === asin),
    [products, asin],
  );

  function reset() {
    setAsin("");
    setRule("price_drop");
    setPct("10");
    setWindowVal("7d");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      toast.error(isAr ? "اختر منتجاً للمتابعة أولاً." : "Pick a product to track first.");
      return;
    }
    if (kind === "pct") {
      const n = Number(pct);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error(isAr ? "أدخل حداً أكبر من 0%." : "Enter a threshold greater than 0%.");
        return;
      }
    }
    const ruleLabel = isAr ? ruleMeta.ar : ruleMeta.en;
    const detail =
      kind === "pct"
        ? isAr ? ` عند -${Number(pct)}%` : ` at -${Number(pct)}%`
        : kind === "window"
          ? isAr ? ` خلال ${windowVal}` : ` over ${windowVal}`
          : "";
    toast.success(isAr ? "تم إنشاء التنبيه (عرض توضيحي)" : "Alert created (demo)", {
      description: `${ruleLabel}${detail} · ${selected.titleEn}`,
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="sm">
            <Plus className="size-4" />
            {isAr ? "تنبيه جديد" : "New alert"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellPlus className="size-4 text-brand" />
            {isAr ? "تنبيه جديد" : "New alert"}
          </DialogTitle>
          <DialogDescription>
            {isAr
              ? "احصل على إشعار عند تحرك منتج متتبَّع. تُقيَّم التنبيهات مقابل لقطات amazon.eg اليومية."
              : "Get notified when a tracked product moves. Alerts are evaluated against our daily amazon.eg snapshots."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          {/* Product */}
          <div className="grid gap-2">
            <Label htmlFor={productId}>{isAr ? "المنتج" : "Product"}</Label>
            <Select
              name="asin"
              value={asin}
              onValueChange={(v) => setAsin((v as string) ?? "")}
            >
              <SelectTrigger id={productId} className="w-full">
                <SelectValue placeholder={isAr ? "اختر منتجاً…" : "Select a product…"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.asin} value={p.asin}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{p.titleEn}</span>
                      {p.titleAr ? (
                        <span
                          dir="rtl"
                          className="font-arabic truncate text-xs text-muted-foreground"
                        >
                          {p.titleAr}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rule */}
          <div className="grid gap-2">
            <Label htmlFor={ruleId}>{isAr ? "القاعدة" : "Rule"}</Label>
            <Select
              name="rule"
              value={rule}
              onValueChange={(v) => setRule(v as AlertRule)}
            >
              <SelectTrigger id={ruleId} className="w-full">
                <SelectValue placeholder={isAr ? "اختر قاعدة…" : "Choose a rule…"} />
              </SelectTrigger>
              <SelectContent>
                {RULES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {isAr ? r.ar : r.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isAr ? ruleMeta.helpAr : ruleMeta.helpEn}
            </p>
          </div>

          {/* Threshold — adapts to the rule */}
          {kind === "pct" ? (
            <div className="grid gap-2">
              <Label htmlFor={pctId}>{isAr ? "الحد الأدنى" : "Threshold"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={pctId}
                  name="threshold"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={90}
                  step={1}
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  className="w-24 tabular-nums"
                />
                <span className="text-sm text-muted-foreground">
                  {isAr
                    ? `% ${rule === "price_drop" ? "انخفاض سعر" : "انخفاض تقييم"} أو أكثر`
                    : `% ${rule === "price_drop" ? "price drop" : "rating drop"} or more`}
                </span>
              </div>
            </div>
          ) : kind === "window" ? (
            <div className="grid gap-2">
              <Label htmlFor={windowId}>{isAr ? "الفترة الزمنية" : "Window"}</Label>
              <Select
                name="threshold"
                value={windowVal}
                onValueChange={(v) => setWindowVal(v as string)}
              >
                <SelectTrigger id={windowId} className="w-full">
                  <SelectValue placeholder={isAr ? "اختر فترة زمنية…" : "Choose a window…"} />
                </SelectTrigger>
                <SelectContent>
                  {WINDOWS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {isAr ? `يتحسن خلال ${w}` : `Improves over ${w}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              {isAr
                ? "لا حاجة لحد أدنى — ستتلقى إشعاراً فور عودة هذا المنتج للمخزون."
                : "No threshold needed — you'll be notified as soon as this item is back in stock."}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {isAr ? "إلغاء" : "Cancel"}
            </DialogClose>
            <Button type="submit">{isAr ? "إنشاء تنبيه" : "Create alert"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
