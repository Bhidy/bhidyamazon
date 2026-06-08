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

/** Human-readable label + icon for each alert rule. */
const RULE_META: Record<
  AlertRule,
  { label: string; icon: typeof BellRing; tone: string }
> = {
  price_drop: { label: "Price drop", icon: TrendingDown, tone: "text-positive" },
  bsr_rising: { label: "Rising rank", icon: ArrowUpRight, tone: "text-brand" },
  back_in_stock: { label: "Back in stock", icon: PackageCheck, tone: "text-confidence-medium" },
  rating_drop: { label: "Rating drop", icon: Star, tone: "text-negative" },
};

/**
 * Turn the structured `Alert.threshold` object into a compact, honest label.
 *   { pct: 10 }     → "-10%"
 *   { window: "7d" }→ "over 7d"
 *   {}              → "Any change"
 */
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

  // Source the product picker from the real data layer (best sellers across all
  // categories) so the dialog stays in sync with what the platform tracks.
  const productOptions: AlertProductOption[] = getBestSellers().map((row) => ({
    asin: row.product.asin,
    titleEn: row.product.titleEn,
    titleAr: row.product.titleAr,
  }));

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Get notified when a tracked product moves."
      >
        <NewAlertDialog products={productOptions} />
      </PageHeader>

      <Card className="gap-0">
        <CardHeader className="flex-row items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base">Your alerts</CardTitle>
            <CardDescription>
              {alerts.length
                ? `${activeCount} active of ${alerts.length} · evaluated against our daily amazon.eg snapshots, not in real time.`
                : "Create your first alert to start tracking movement."}
            </CardDescription>
          </div>
          {alerts.length ? (
            <Badge variant="outline" className="tabular-nums">
              {alerts.length} {alerts.length === 1 ? "rule" : "rules"}
            </Badge>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {alerts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last fired</TableHead>
                  <TableHead className="pr-4">Created</TableHead>
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
                          {meta.label}
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
                          <span className="text-xs text-muted-foreground">
                            {alert.active ? "Active" : "Paused"}
                          </span>
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
                  No alerts yet
                </p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Track a product and we&apos;ll notify you on a price drop,
                  rising rank, restock, or rating slip.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <NewAlertDialog products={productOptions} />
                <ButtonLink href="/bestsellers" variant="outline" size="sm">
                  Browse products
                </ButtonLink>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
