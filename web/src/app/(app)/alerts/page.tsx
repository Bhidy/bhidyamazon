import { PageHeader } from "@/components/app/page-header";
import { getBestSellers, getDashboardSummary, getMovers } from "@/lib/data";
import {
  NewAlertDialog,
  type AlertProductOption,
} from "./_components/new-alert-dialog";
import { AlertsTable } from "./_components/alerts-table";

/**
 * Alerts = the user's REAL rules (persistent localStorage store), evaluated on
 * view against the latest committed snapshot. The server's job is to provide
 * the evaluation context: today's facts per product, the rank-rising lists per
 * window, and the snapshot timestamp.
 */
export default async function AlertsPage() {
  const products: AlertProductOption[] = getBestSellers({}).map(({ product }) => ({
    asin: product.asin,
    titleEn: product.titleEn,
    titleAr: product.titleAr,
    priceEgp: product.priceEgp,
    bsr: product.bsr,
    rating: product.rating,
    inStock: product.inStock,
  }));

  // Rank-rising membership per alert window, from the same velocity engine the
  // Movers page uses (one source of truth for "rising").
  const risingAsins = {
    "24h": getMovers({ period: "daily" }).map((r) => r.product.asin),
    "7d": getMovers({ period: "weekly" }).map((r) => r.product.asin),
    "30d": getMovers({ period: "monthly" }).map((r) => r.product.asin),
  };

  const evaluatedAt = getDashboardSummary("daily").lastUpdated;

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
            <span data-bi-en="">
              Saved on this device · checked against the latest daily snapshot when you open this page.
            </span>
            <span data-bi-ar="">
              تُحفظ على هذا الجهاز · تُفحص مقابل أحدث لقطة يومية عند فتح هذه الصفحة.
            </span>
          </>
        }
      >
        <NewAlertDialog products={products} />
      </PageHeader>

      <AlertsTable products={products} risingAsins={risingAsins} evaluatedAt={evaluatedAt} />
    </>
  );
}
