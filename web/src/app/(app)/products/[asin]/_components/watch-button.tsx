"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { useWatchlist, type WatchlistEntry } from "@/lib/watchlist-store";
import type { Product } from "@/lib/types";

/**
 * Add/remove a product on the persistent watchlist (localStorage-backed via
 * WatchlistProvider). The full product snapshot is captured at add-time so the
 * watchlist can still render the item if it later drops off the scraped lists.
 */
export function WatchButton({ product }: { product: Product }) {
  const { locale } = useLocale();
  const { isWatched, add, remove, ready } = useWatchlist();
  const isAr = locale === "ar";
  const asin = product.asin;
  const title = product.titleEn;
  const watched = isWatched(asin);

  function entryFromProduct(): WatchlistEntry {
    return {
      addedAt: new Date().toISOString(),
      titleEn: product.titleEn,
      titleAr: product.titleAr,
      brand: product.brand,
      categoryNode: product.categoryNode,
      categoryName: product.categoryName,
      priceEgp: product.priceEgp,
      rating: product.rating,
      reviewCount: product.reviewCount,
      bsr: product.bsr,
      imageUrl: product.imageUrl,
    };
  }

  function onClick() {
    if (!watched) {
      const entry = entryFromProduct();
      add(asin, entry);
      toast.success(isAr ? "أُضيف إلى قائمة المتابعة" : "Added to watchlist", {
        description: title,
        action: {
          label: isAr ? "تراجع" : "Undo",
          onClick: () => remove(asin),
        },
      });
    } else {
      remove(asin);
      toast(isAr ? "أُزيل من قائمة المتابعة" : "Removed from watchlist", { description: title });
    }
  }

  return (
    <Button
      type="button"
      variant={watched ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={!ready}
      aria-pressed={watched}
      aria-label={
        watched
          ? (isAr ? `إزالة ${title} من قائمة المتابعة` : `Remove ${title} from watchlist`)
          : (isAr ? `إضافة ${title} إلى قائمة المتابعة` : `Add ${title} to watchlist`)
      }
      data-asin={asin}
    >
      {watched ? (
        <BookmarkCheck className="size-4 text-positive" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {watched
        ? (isAr ? "تتم المتابعة" : "Watching")
        : (isAr ? "أضف للمتابعة" : "Add to watchlist")}
    </Button>
  );
}
