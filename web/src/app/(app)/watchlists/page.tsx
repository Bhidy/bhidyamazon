import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ButtonLink } from "@/components/app/button-link";
import { getBestSellers } from "@/lib/data";
import { WatchlistGrid, type LiveProduct } from "./_components/watchlist-grid";

/**
 * Watchlist = the user's REAL tracked products (persistent localStorage store,
 * see lib/watchlist-store.tsx). The server's job here is only to provide
 * today's scraped facts for the join — items still on a tracked list render
 * current values; items that dropped off render their add-time snapshot,
 * visibly flagged.
 */
export default async function WatchlistsPage() {
  const liveProducts: LiveProduct[] = getBestSellers({}).map(({ product }) => ({
    asin: product.asin,
    titleEn: product.titleEn,
    titleAr: product.titleAr,
    brand: product.brand,
    categoryName: product.categoryName,
    priceEgp: product.priceEgp,
    rating: product.rating,
    reviewCount: product.reviewCount,
    bsr: product.bsr,
    imageUrl: product.imageUrl,
  }));

  return (
    <>
      <PageHeader
        title={
          <>
            <span data-bi-en="">Watchlists</span>
            <span data-bi-ar="">قوائم المتابعة</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">Products you&apos;re tracking to source. Saved on this device.</span>
            <span data-bi-ar="">المنتجات التي تتابعها للتوريد. تُحفظ على هذا الجهاز.</span>
          </>
        }
      >
        <ButtonLink href="/products" variant="outline" size="sm">
          <Plus className="size-4" />
          <span data-bi-en="">Add products</span>
          <span data-bi-ar="">أضف منتجات</span>
        </ButtonLink>
      </PageHeader>

      <WatchlistGrid liveProducts={liveProducts} />
    </>
  );
}
