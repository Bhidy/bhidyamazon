"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ProductThumb } from "@/components/app/product-thumb";
import { RatingStars } from "@/components/app/rating-stars";
import { DemandBadge } from "@/components/app/badges";
import { ConfidenceBadge } from "@/components/app/confidence";
import { formatEgp, formatRank, formatDate } from "@/lib/format";
import { DISCLOSURE } from "@/lib/constants";
import type { DemandBand, WatchlistItem } from "@/lib/types";
import { RemoveButton } from "./remove-button";

/**
 * Within-category demand band from absolute BSR. Mirrors the thresholds in
 * `@/lib/data#demandBandFor` so a watched product reads the same band it shows
 * everywhere else. Always a relative indicator — never a unit count.
 */
function demandBandFromBsr(bsr: number | undefined): DemandBand {
  if (bsr == null) return "unknown";
  if (bsr < 300) return "very-high";
  if (bsr < 1000) return "high";
  if (bsr < 3000) return "moderate";
  return "low";
}

/** One tracked product, rendered as a card. Removable (optimistic, client-only). */
export function WatchCard({ item }: { item: WatchlistItem }) {
  const [removed, setRemoved] = useState(false);
  const p = item.product;

  if (removed) return null;

  const band = demandBandFromBsr(p.bsr);

  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-start gap-3 border-b pb-4">
        <ProductThumb product={p} size={56} />
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/products/${p.asin}`}
            className="block truncate text-sm font-medium text-foreground hover:underline"
            title={p.titleEn}
          >
            {p.titleEn}
          </Link>
          {p.titleAr && (
            <p dir="rtl" className="truncate font-arabic text-xs text-muted-foreground" title={p.titleAr}>
              {p.titleAr}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {p.brand && <span className="truncate">{p.brand}</span>}
            {p.brand && p.categoryName && <span aria-hidden>·</span>}
            {p.categoryName && <span className="truncate">{p.categoryName}</span>}
          </div>
        </div>
        <div className="shrink-0 text-end">
          <div className="text-sm font-semibold tabular-nums text-foreground">{formatEgp(p.priceEgp)}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RatingStars rating={p.rating} count={p.reviewCount} size={13} />
          <div className="flex items-center gap-1.5">
            <DemandBadge band={band} />
            <ConfidenceBadge confidence="low" note={DISCLOSURE.demandProxyEn} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">BSR</span>
          <span className="tabular-nums font-medium text-foreground" title={DISCLOSURE.ordinalEn}>
            {formatRank(p.bsr)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarPlus className="size-3.5" />
          Added {formatDate(item.addedAt)}
        </span>
        <RemoveButton
          title={p.titleEn}
          onRemove={() => setRemoved(true)}
          onRestore={() => setRemoved(false)}
        />
      </CardFooter>
    </Card>
  );
}
