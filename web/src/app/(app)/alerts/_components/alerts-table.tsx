"use client";

import {
  ArrowUpRight,
  BellOff,
  BellRing,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  PackageCheck,
  Star,
  Trash2,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ButtonLink } from "@/components/app/button-link";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import {
  evaluateAlert,
  useAlerts,
  type AlertCurrent,
  type AlertEvalStatus,
  type StoredAlert,
} from "@/lib/alerts-store";
import type { AlertRule } from "@/lib/types";
import { NewAlertDialog, type AlertProductOption } from "./new-alert-dialog";

const RULE_META: Record<
  AlertRule,
  { labelEn: string; labelAr: string; icon: typeof BellRing; tone: string }
> = {
  price_drop:   { labelEn: "Price drop",    labelAr: "انخفاض السعر",    icon: TrendingDown, tone: "text-positive" },
  bsr_rising:   { labelEn: "Rising rank",   labelAr: "ارتفاع الترتيب", icon: ArrowUpRight,  tone: "text-brand" },
  back_in_stock:{ labelEn: "Back in stock", labelAr: "عاد للمخزون",    icon: PackageCheck,  tone: "text-confidence-medium" },
  rating_drop:  { labelEn: "Rating drop",   labelAr: "انخفاض التقييم", icon: Star,          tone: "text-negative" },
};

function humanizeThreshold(threshold: Record<string, number | string>): string {
  if (threshold.pct != null) return `-${threshold.pct}%`;
  if (threshold.window != null) return `over ${threshold.window}`;
  if (threshold.delta != null) return `-${threshold.delta}`;
  const entries = Object.entries(threshold);
  if (entries.length === 0) return "Any change";
  return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
}

const EVAL_META: Record<
  AlertEvalStatus,
  { labelEn: string; labelAr: string; icon: typeof CircleCheck; cls: string }
> = {
  met: {
    labelEn: "Triggered",
    labelAr: "تحقق الشرط",
    icon: CircleCheck,
    cls: "text-positive border-positive/30 bg-positive/10",
  },
  "not-met": {
    labelEn: "No trigger",
    labelAr: "لم يتحقق",
    icon: CircleDashed,
    cls: "text-muted-foreground border-border bg-muted/40",
  },
  "no-data": {
    labelEn: "No data",
    labelAr: "لا بيانات",
    icon: CircleHelp,
    cls: "text-confidence-low border-confidence-low/30 bg-confidence-low/10",
  },
};

/**
 * The user's REAL alert rules (persistent localStorage store), evaluated ON
 * VIEW against the latest committed snapshot the server passed down. Honest
 * framing: this is a daily-snapshot check performed when the page renders —
 * not a background engine, and the header copy says so.
 */
export function AlertsTable({
  products,
  risingAsins,
  evaluatedAt,
}: {
  products: AlertProductOption[];
  /** asins on the rank-rising list per window ("24h" | "7d" | "30d"). */
  risingAsins: Record<string, string[]>;
  /** ISO timestamp of the snapshot the evaluation ran against. */
  evaluatedAt: string;
}) {
  const { alerts, ready, setActive, remove, add } = useAlerts();
  const { locale } = useLocale();
  const isAr = locale === "ar";

  if (!ready) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const currentByAsin = new Map<string, AlertCurrent>(
    products.map((p) => [p.asin, { priceEgp: p.priceEgp, bsr: p.bsr, rating: p.rating, inStock: p.inStock }]),
  );
  const risingSets: Record<string, Set<string>> = Object.fromEntries(
    Object.entries(risingAsins).map(([w, asins]) => [w, new Set(asins)]),
  );

  const rows = Object.values(alerts).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const activeCount = rows.filter((a) => a.active).length;

  function onToggle(alert: StoredAlert, next: boolean) {
    setActive(alert.id, next);
    if (next) {
      toast.success(isAr ? "تم تفعيل التنبيه" : "Alert enabled", { description: alert.titleEn });
    } else {
      toast(isAr ? "تم إيقاف التنبيه" : "Alert paused", { description: alert.titleEn });
    }
  }

  function onDelete(alert: StoredAlert) {
    remove(alert.id);
    toast(isAr ? "حُذف التنبيه" : "Alert deleted", {
      description: alert.titleEn,
      action: {
        label: isAr ? "تراجع" : "Undo",
        onClick: () => add(alert),
      },
    });
  }

  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {isAr ? "تنبيهاتك" : "Your alerts"}
          </CardTitle>
          <CardDescription>
            {rows.length
              ? isAr
                ? `${activeCount} نشط من ${rows.length} · محفوظة على هذا الجهاز، وتُقيَّم عند فتح الصفحة مقابل لقطة ${formatDate(evaluatedAt, "ar")} — ليس في الوقت الفعلي.`
                : `${activeCount} active of ${rows.length} · saved on this device, evaluated on view against the ${formatDate(evaluatedAt)} snapshot — not real-time.`
              : isAr
                ? "أنشئ تنبيهك الأول لبدء تتبع الحركة."
                : "Create your first alert to start tracking movement."}
          </CardDescription>
        </div>
        {rows.length ? (
          <Badge variant="outline" className="tabular-nums">
            {rows.length} {rows.length === 1 ? (isAr ? "قاعدة" : "rule") : (isAr ? "قواعد" : "rules")}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{isAr ? "المنتج" : "Product"}</TableHead>
                <TableHead>{isAr ? "القاعدة" : "Rule"}</TableHead>
                <TableHead>{isAr ? "الحد" : "Threshold"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isAr ? "عند آخر لقطة" : "At last snapshot"}</TableHead>
                <TableHead>{isAr ? "التاريخ" : "Created"}</TableHead>
                <TableHead className="pr-4 text-end">
                  <span className="sr-only">{isAr ? "إجراءات" : "Actions"}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((alert) => {
                const meta = RULE_META[alert.rule];
                const Icon = meta.icon;
                const status = alert.active
                  ? evaluateAlert(alert, currentByAsin.get(alert.asin), (w) => risingSets[w]?.has(alert.asin) ?? false)
                  : null;
                const evalMeta = status ? EVAL_META[status] : null;
                const EvalIcon = evalMeta?.icon ?? CircleDashed;
                return (
                  <TableRow key={alert.id}>
                    <TableCell className="max-w-[260px] pl-4">
                      <Link
                        href={`/products/${alert.asin}`}
                        className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                        title={alert.titleEn}
                      >
                        {isAr && alert.titleAr ? alert.titleAr : alert.titleEn}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">{alert.asin}</span>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
                        <Icon className={`size-3.5 ${meta.tone}`} />
                        {isAr ? meta.labelAr : meta.labelEn}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium tabular-nums">{humanizeThreshold(alert.threshold)}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.active}
                          onCheckedChange={(next) => onToggle(alert, next)}
                          aria-label={
                            alert.active
                              ? (isAr ? `إيقاف تنبيه لـ ${alert.titleEn}` : `Pause alert for ${alert.titleEn}`)
                              : (isAr ? `تفعيل تنبيه لـ ${alert.titleEn}` : `Enable alert for ${alert.titleEn}`)
                          }
                        />
                        <Badge variant={alert.active ? "success" : "secondary"}>
                          {alert.active ? (isAr ? "نشط" : "Active") : (isAr ? "موقوف" : "Paused")}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell>
                      {evalMeta ? (
                        <Badge
                          variant="outline"
                          className={`gap-1 ${evalMeta.cls}`}
                          title={
                            status === "no-data"
                              ? isAr
                                ? "المنتج خارج القوائم المتتبعة أو القيمة المطلوبة غير متوفرة"
                                : "Product is off the tracked lists, or the needed value is missing"
                              : undefined
                          }
                        >
                          <EvalIcon className="size-3" />
                          {isAr ? evalMeta.labelAr : evalMeta.labelEn}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formatDate(alert.createdAt, isAr ? "ar" : "en")}
                    </TableCell>

                    <TableCell className="pr-4 text-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(alert)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={isAr ? `حذف تنبيه ${alert.titleEn}` : `Delete alert for ${alert.titleEn}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellOff className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {isAr ? "لا تنبيهات بعد" : "No alerts yet"}
              </p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                {isAr
                  ? "تابع منتجاً وسيظهر هنا ما إذا تحقق شرطه — انخفاض سعر أو ارتفاع ترتيب أو عودة مخزون أو تراجع تقييم — عند كل لقطة يومية."
                  : "Track a product and this page will show whether its condition — a price drop, rising rank, restock, or rating slip — holds at each daily snapshot."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NewAlertDialog products={products} />
              <ButtonLink href="/bestsellers" variant="outline" size="sm">
                {isAr ? "تصفح المنتجات" : "Browse products"}
              </ButtonLink>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
