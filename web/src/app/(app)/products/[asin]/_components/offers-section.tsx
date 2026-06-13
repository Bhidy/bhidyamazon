import { Award, ExternalLink, Store, Tag, Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/app/confidence";
import { formatEgp, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OfferBook } from "@/lib/types";

/**
 * Other sellers & offers — the SAME amazon.eg listing from competing Egyptian
 * merchants (scraped from the offer-listing/AOD page). Cheapest first, with the
 * buy-box and lowest-price offers flagged. When per-seller offers haven't been
 * scraped yet, it degrades to the reported offer count + the Amazon deep link
 * (never fabricates sellers).
 */
export function OffersSection({ book }: { book: OfferBook }) {
  const { offers, reportedOfferCount, amazonOffersUrl } = book;
  const cheapestPrice = offers.find((o) => o.priceEgp != null)?.priceEgp;

  return (
    <Card className="gap-0">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="size-4 text-brand" />
              <span data-bi-en="">Other sellers &amp; offers</span>
              <span data-bi-ar="">بائعون وعروض أخرى</span>
              {offers.length > 0 && (
                <span className="text-sm font-normal tabular-nums text-muted-foreground">
                  {formatNumber(offers.length)}{" "}
                  <span data-bi-en="">shown</span>
                  <span data-bi-ar="">معروض</span>
                </span>
              )}
            </CardTitle>
            <CardDescription>
              <span data-bi-en="">Same product, competing Egyptian sellers on amazon.eg.</span>
              <span data-bi-ar="">نفس المنتج، بائعون مصريون متنافسون على amazon.eg.</span>
            </CardDescription>
          </div>
          <ConfidenceBadge confidence="high" note="Seller, price & fulfilment scraped from the amazon.eg offer-listing." />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {offers.length ? (
          <ul className="divide-y divide-border">
            {offers.map((o, i) => {
              const isCheapest = o.priceEgp != null && o.priceEgp === cheapestPrice;
              return (
                <li
                  key={`${o.sellerId ?? o.sellerName ?? "s"}-${i}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-xs font-semibold tabular-nums text-brand-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {o.sellerName ?? (
                          <>
                            <span data-bi-en="">Unnamed seller</span>
                            <span data-bi-ar="">بائع غير مُسمّى</span>
                          </>
                        )}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                            o.fba
                              ? "border-brand/30 bg-brand/10 text-brand"
                              : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          <Truck className="size-3" />
                          {o.fba ? (
                            <>
                              <span data-bi-en="">Fulfilled by Amazon</span>
                              <span data-bi-ar="">شحن أمازون</span>
                            </>
                          ) : (
                            <>
                              <span data-bi-en="">Merchant-fulfilled</span>
                              <span data-bi-ar="">شحن البائع</span>
                            </>
                          )}
                        </span>
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {o.condition}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      {o.isBuyBox && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-1.5 py-0.5 text-[10px] font-semibold text-positive">
                          <Award className="size-3" />
                          <span data-bi-en="">Buy box</span>
                          <span data-bi-ar="">صندوق الشراء</span>
                        </span>
                      )}
                      {isCheapest && !o.isBuyBox && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                          <Tag className="size-3" />
                          <span data-bi-en="">Lowest price</span>
                          <span data-bi-ar="">أقل سعر</span>
                        </span>
                      )}
                    </div>
                    <span className="min-w-[88px] text-end text-base font-bold tabular-nums text-foreground">
                      {formatEgp(o.priceEgp)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center sm:px-6">
            <p className="text-sm text-muted-foreground">
              {reportedOfferCount ? (
                <>
                  <span data-bi-en="">
                    Amazon lists {formatNumber(reportedOfferCount)} offer(s) for this product. Per-seller
                    detail isn&apos;t scraped yet for this item.
                  </span>
                  <span data-bi-ar="">
                    تعرض أمازون {formatNumber(reportedOfferCount)} عرضًا لهذا المنتج. لم يتم بعد جمع تفاصيل
                    كل بائع لهذا المنتج.
                  </span>
                </>
              ) : (
                <>
                  <span data-bi-en="">No competing-seller offers captured for this product yet.</span>
                  <span data-bi-ar="">لم يتم جمع عروض بائعين منافسين لهذا المنتج بعد.</span>
                </>
              )}
            </p>
          </div>
        )}

        <div className="border-t px-4 py-3 sm:px-6">
          <a
            href={amazonOffersUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-2 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            <span data-bi-en="">See all offers on Amazon.eg</span>
            <span data-bi-ar="">عرض كل العروض على Amazon.eg</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
