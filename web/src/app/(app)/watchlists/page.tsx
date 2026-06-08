import { Bookmark, Compass, Telescope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { CalibrationNotice } from "@/components/app/calibration-notice";
import { ButtonLink } from "@/components/app/button-link";
import { getWatchlist } from "@/lib/data";
import { NewListButton } from "./_components/new-list-button";
import { WatchCard } from "./_components/watch-card";

export default async function WatchlistsPage() {
  const items = getWatchlist();

  return (
    <>
      <PageHeader title="Watchlists" description="Products you're tracking to source.">
        <NewListButton />
      </PageHeader>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Telescope className="size-6" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-base">No products tracked yet</CardTitle>
              <CardDescription className="mx-auto max-w-sm">
                Watch products to keep an eye on their rank, price, and demand over time —
                then move on the ones worth sourcing. Start from the best-seller lists.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ButtonLink href="/bestsellers" size="sm">
                <Compass className="size-4" />
                Browse best sellers
              </ButtonLink>
              <ButtonLink href="/products" variant="outline" size="sm">
                Explore all products
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bookmark className="size-4 text-brand" />
            <span className="tabular-nums">
              {items.length} {items.length === 1 ? "product" : "products"} tracked
            </span>
          </div>

          <CalibrationNotice />

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
