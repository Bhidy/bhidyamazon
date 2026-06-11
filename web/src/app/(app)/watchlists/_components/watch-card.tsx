"use client";

import Link from "next/link";
import { CalendarPlus, PackageX } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductThumb } from "@/components/app/product-thumb";
import { RatingStars } from "@/components/app/rating-stars";
import { formatEgp, formatRank, formatDate } from "@/lib/format";
import { DISCLOSURE } from "@/lib/constants";
import { RemoveButton } from "./remove-button";
import { useLocale } from "@/lib/locale";

/**
 * One watched product. `live: true` means the row is joined with today's
 * scraped data; `live: false` means the product is currently off the tracked
 * best-seller lists, so the values shown are the SNAPSHOT captured when the
 * user added it — flagged, never silently presented as current.
 */
export interface WatchRow {
  asin: string;
  addedAt: string;
  live: boolean;
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

export function WatchCard({
  row,
  onRemove,
  onRestore,
}: {
  row: WatchRow;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  return (
    <Card className="card-hover gap-0">
      <CardHeader className="flex-row items-start gap-3 border-b pb-4">
        <ProductThumb product={row} size={56} />
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/products/${row.asin}`}
            className="block truncate text-sm font-medium text-foreground hover:underline"
            title={row.titleEn}
          >
            {row.titleEn}
          </Link>
          {row.titleAr && (
            <p dir="rtl" className="truncate font-arabic text-xs text-muted-foreground" title={row.titleAr}>
              {row.titleAr}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {row.brand && <span className="truncate">{row.brand}</span>}
            {row.brand && row.categoryName && <span aria-hidden>·</span>}
            {row.categoryName && <span className="truncate">{row.categoryName}</span>}
          </div>
        </div>
        <div className="shrink-0 text-end">
          <div className="text-base font-bold tabular-nums text-foreground">{formatEgp(row.priceEgp)}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 py-4">
        <RatingStars rating={row.rating} count={row.reviewCount} size={13} />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">BSR</span>
          <span className="tabular-nums font-medium text-foreground" title={DISCLOSURE.ordinalEn}>
            {formatRank(row.bsr)}
          </span>
        </div>

        {!row.live && (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <PackageX className="size-3" />
            {isAr
              ? "خارج القوائم المتتبعة حاليًا — القيم من لحظة الإضافة"
              : "Off tracked lists — values from when you added it"}
          </Badge>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarPlus className="size-3.5" />
          {isAr ? "أُضيف" : "Added"} {formatDate(row.addedAt)}
        </span>
        <RemoveButton title={row.titleEn} onRemove={onRemove} onRestore={onRestore} />
      </CardFooter>
    </Card>
  );
}
