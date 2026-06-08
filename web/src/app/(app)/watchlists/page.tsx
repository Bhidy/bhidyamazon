import { Bookmark, Compass, Telescope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { ButtonLink } from "@/components/app/button-link";
import { getWatchlist } from "@/lib/data";
import { NewListButton } from "./_components/new-list-button";
import { WatchCard } from "./_components/watch-card";

export default async function WatchlistsPage() {
  const items = getWatchlist();

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
            <span data-bi-en="">Products you&apos;re tracking to source.</span>
            <span data-bi-ar="">المنتجات التي تتابعها للتوريد.</span>
          </>
        }
      >
        <NewListButton />
      </PageHeader>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Telescope className="size-6" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-base">
                <span data-bi-en="">No products tracked yet</span>
                <span data-bi-ar="">لا توجد منتجات متتبعة بعد</span>
              </CardTitle>
              <CardDescription className="mx-auto max-w-sm">
                <span data-bi-en="">
                  Watch products to keep an eye on their rank, price, and demand over time —
                  then move on the ones worth sourcing. Start from the best-seller lists.
                </span>
                <span data-bi-ar="">
                  تابع المنتجات لرصد ترتيبها وسعرها وطلبها بمرور الوقت —
                  ثم تحرك نحو الأجدر بالتوريد. ابدأ من قوائم الأكثر مبيعاً.
                </span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ButtonLink href="/bestsellers" size="sm">
                <Compass className="size-4" />
                <span data-bi-en="">Browse best sellers</span>
                <span data-bi-ar="">تصفح الأكثر مبيعاً</span>
              </ButtonLink>
              <ButtonLink href="/products" variant="outline" size="sm">
                <span data-bi-en="">Explore all products</span>
                <span data-bi-ar="">استعرض كل المنتجات</span>
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bookmark className="size-4 text-brand" />
            <span className="tabular-nums">
              <span data-bi-en="">
                {items.length} {items.length === 1 ? "product" : "products"} tracked
              </span>
              <span data-bi-ar="">
                {items.length} {items.length === 1 ? "منتج" : "منتجات"} متتبع
              </span>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <WatchCard key={item.asin} item={item} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
