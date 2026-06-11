"use client";

import { Bookmark, Compass, Telescope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ButtonLink } from "@/components/app/button-link";
import { useWatchlist } from "@/lib/watchlist-store";
import { WatchCard, type WatchRow } from "./watch-card";

/**
 * Today's scraped facts for a product, passed down from the Server Component so
 * watched items render CURRENT values when the product is still on a tracked
 * list. Items not in this map fall back to their add-time snapshot (flagged).
 */
export interface LiveProduct {
  asin: string;
  titleEn: string;
  titleAr?: string;
  brand?: string;
  categoryName?: string;
  priceEgp?: number;
  rating?: number;
  reviewCount?: number;
  bsr?: number;
  imageUrl?: string;
}

export function WatchlistGrid({ liveProducts }: { liveProducts: LiveProduct[] }) {
  const { items, ready, remove, add } = useWatchlist();

  if (!ready) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  const liveByAsin = new Map(liveProducts.map((p) => [p.asin, p]));
  const rows: WatchRow[] = Object.entries(items)
    .map(([asin, entry]): WatchRow => {
      const liveData = liveByAsin.get(asin);
      return liveData
        ? { ...liveData, asin, addedAt: entry.addedAt, live: true }
        : { ...entry, asin, live: false };
    })
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));

  if (rows.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bookmark className="size-4 text-brand" />
        <span className="tabular-nums">
          <span data-bi-en="">
            {rows.length} {rows.length === 1 ? "product" : "products"} tracked
          </span>
          <span data-bi-ar="">
            {rows.length} {rows.length === 1 ? "منتج" : "منتجات"} متتبع
          </span>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const entry = items[row.asin];
          return (
            <WatchCard
              key={row.asin}
              row={row}
              onRemove={() => remove(row.asin)}
              onRestore={() => add(row.asin, entry)}
            />
          );
        })}
      </div>
    </>
  );
}
