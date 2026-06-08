"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { hashString } from "@/lib/seed";
import type { Product } from "@/lib/types";

const GRADIENTS = [
  "from-chart-1/25 to-chart-1/5 text-chart-1",
  "from-chart-2/25 to-chart-2/5 text-chart-2",
  "from-chart-3/25 to-chart-3/5 text-chart-3",
  "from-chart-4/25 to-chart-4/5 text-chart-4",
  "from-chart-5/25 to-chart-5/5 text-chart-5",
];

function initials(p: Product): string {
  const src = p.brand || p.titleEn;
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Product image with a graceful branded fallback tile (the live scraper has no
 * licensed image rights, so a clean initials tile is the intentional default).
 */
export function ProductThumb({
  product,
  size = 48,
  className,
}: {
  product: Product;
  size?: number;
  className?: string;
}) {
  const radius = "rounded-xl";
  // Real Amazon image URLs can fail to hotlink; fall back to the branded tile.
  const [errored, setErrored] = useState(false);
  if (product.imageUrl && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt={product.titleEn}
        width={size}
        height={size}
        className={cn(radius, "border border-border/70 bg-card object-contain", className)}
        style={{ width: size, height: size }}
        loading="lazy"
        onError={() => setErrored(true)}
      />
    );
  }
  const g = GRADIENTS[hashString(product.brand || product.asin) % GRADIENTS.length];
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border border-border/70 bg-gradient-to-br font-semibold",
        radius,
        g,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials(product)}
    </div>
  );
}
