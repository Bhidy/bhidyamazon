import {
  ArrowUpRight,
  BellOff,
  BellRing,
  PackageCheck,
  Star,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
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
import { PageHeader } from "@/components/app/page-header";
import { ButtonLink } from "@/components/app/button-link";
import { getAlerts, getBestSellers } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { AlertRule } from "@/lib/types";
import {
  NewAlertDialog,
  type AlertProductOption,
} from "./_components/new-alert-dialog";
import { AlertToggle } from "./_components/alert-toggle";

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

export default async function AlertsPage() {
  const alerts = getAlerts();

  const productOptions: AlertProductOption[] = getBestSellers().map((row) => ({
    asin: row.product.asin,
    titleEn: row.product.titleEn,
    titleAr: row.product.titleAr,
  }));

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <>
      <PageHeader
        title={
          <>
            <span data-bi-en="">Alerts</span>
            <span data-bi-ar="">التنبيهات</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">Get notified when a tracked product moves.</span>
            <span data-bi-ar="">احصل على إشعار عند تحرك منتج متتبع.</span>
          </>
        }
      >
        <NewAlertDialog products={productOptions} />
      </PageHeader>

      <Card className="gap-0">
        <CardHeader className="flex-row items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base">
              <span data-bi-en="">Your alerts</span>
              <span data-bi-ar="">تنبيهاتك</span>
            </CardTitle>
            <CardDescription>
              {alerts.length ? (
                <>
                  <span data-bi-en="">{activeCount} active of {alerts.length} · evaluated against our daily amazon.eg snapshots, not in real time.</span>
                  <span data-bi-ar="">{activeCount} نشط من {alerts.length} · تُقيَّم مقابل لقطاتنا اليومية من amazon.eg، ليس في الوقت الفعلي.</span>
                </>
              ) : (
                <>
                  <span data-bi-en="">Create your first alert to start tracking movement.</span>
                  <span data-bi-ar="">أنشئ تنبيهك الأول لبدء تتبع الحركة.</span>
                </>
              )}
            </CardDescription>
          </div>
          {alerts.length ? (
            <Badge variant="outline" className="tabular-nums">
              <span data-bi-en="">{alerts.length} {alerts.length === 1 ? "rule" : "rules"}</span>
              <span data-bi-ar="">{alerts.length} {alerts.length === 1 ? "قاعدة" : "قواعد"}</span>
            </Badge>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {alerts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">
                    <span data-bi-en="">Product</span>
                    <span data-bi-ar="">المنتج</span>
                  </TableHead>
                  <TableHead>
                    <span data-bi-en="">Rule</span>
                    <span data-bi-ar="">القاعدة</span>
                  </TableHead>
                  <TableHead>
                    <span data-bi-en="">Threshold</span>
                    <span data-bi-ar="">الحد</span>
                  </TableHead>
                  <TableHead>
                    <span data-bi-en="">Status</span>
                    <span data-bi-ar="">الحالة</span>
                  </TableHead>
                  <TableHead>
                    <span data-bi-en="">Last fired</span>
                    <span data-bi-ar="">آخر تشغيل</span>
                  </TableHead>
                  <TableHead className="pr-4">
                    <span data-bi-en="">Created</span>
                    <span data-bi-ar="">التاريخ</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const meta = RULE_META[alert.rule];
                  const Icon = meta.icon;
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="max-w-[260px] pl-4">
                        <Link
                          href={`/products/${alert.asin}`}
                          className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                          title={alert.productTitle}
                        >
                          {alert.productTitle}
                        </Link>
                        <span className="font-mono text-xs text-muted-foreground">
                          {alert.asin}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
                          <Icon className={`size-3.5 ${meta.tone}`} />
                          <span data-bi-en="">{meta.labelEn}</span>
                          <span data-bi-ar="">{meta.labelAr}</span>
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium tabular-nums">
                          {humanizeThreshold(alert.threshold)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertToggle
                            alertId={alert.id}
                            productTitle={alert.productTitle}
                            active={alert.active}
                          />
                          <Badge variant={alert.active ? "success" : "secondary"}>
                            <span data-bi-en="">{alert.active ? "Active" : "Paused"}</span>
                            <span data-bi-ar="">{alert.active ? "نشط" : "موقوف"}</span>
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {alert.lastFiredAt ? formatDate(alert.lastFiredAt) : "—"}
                      </TableCell>

                      <TableCell className="pr-4 text-sm tabular-nums text-muted-foreground">
                        {formatDate(alert.createdAt)}
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
                  <span data-bi-en="">No alerts yet</span>
                  <span data-bi-ar="">لا تنبيهات بعد</span>
                </p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  <span data-bi-en="">
                    Track a product and we&apos;ll notify you on a price drop,
                    rising rank, restock, or rating slip.
                  </span>
                  <span data-bi-ar="">
                    تابع منتجاً وسنُخطرك عند انخفاض السعر أو ارتفاع الترتيب أو عودة المخزون أو تراجع التقييم.
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <NewAlertDialog products={productOptions} />
                <ButtonLink href="/bestsellers" variant="outline" size="sm">
                  <span data-bi-en="">Browse products</span>
                  <span data-bi-ar="">تصفح المنتجات</span>
                </ButtonLink>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
