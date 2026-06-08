"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatEgp, formatRank } from "@/lib/format";

export interface HistoryPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  bsr: number | null;
  price: number | null;
}

const chartConfig = {
  bsr: { label: "Best Seller Rank", color: "var(--chart-1)" },
  price: { label: "Price (EGP)", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Short axis date label, e.g. "8 Jun". */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(d);
}

/**
 * Keepa-style dual-axis history chart.
 *  - Left axis = BSR, REVERSED so an improving (lower) rank trends upward —
 *    matching the "going up is good" mental model.
 *  - Right axis = price in EGP, drawn as a soft filled area behind the rank line.
 * Data is passed in from the server page so the heavy series stay off the client
 * bundle until hydration.
 */
export function HistoryChart({ data }: { data: HistoryPoint[] }) {
  // Pad the BSR domain a touch so the reversed line never clips the frame.
  const bsrDomain = useMemo<[number, number]>(() => {
    const vals = data.map((d) => d.bsr).filter((v): v is number => v != null);
    if (!vals.length) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(1, Math.round((max - min) * 0.08));
    return [Math.max(1, min - pad), max + pad];
  }, [data]);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="rasid-price-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-price)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-price)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} strokeDasharray="3 3" />

        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
          tickMargin={8}
        />

        {/* Left axis: BSR — reversed so lower rank = higher on the chart. */}
        <YAxis
          yAxisId="bsr"
          orientation="left"
          reversed
          domain={bsrDomain}
          width={56}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tickFormatter={(v: number) => formatRank(Math.round(v))}
        />

        {/* Right axis: price in EGP. */}
        <YAxis
          yAxisId="price"
          orientation="right"
          domain={["dataMin", "dataMax"]}
          width={64}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tickFormatter={(v: number) => formatEgp(Math.round(v), "en", { compact: true })}
        />

        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => shortDate(String(value))}
              formatter={(rawValue, name) => {
                const value = Number(rawValue);
                const isBsr = name === "bsr";
                const label = isBsr ? "Best Seller Rank" : "Price";
                const display = isBsr
                  ? formatRank(value)
                  : formatEgp(value);
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2 rounded-[2px]"
                        style={{ backgroundColor: isBsr ? "var(--color-bsr)" : "var(--color-price)" }}
                      />
                      {label}
                    </span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {display}
                    </span>
                  </div>
                );
              }}
            />
          }
        />

        {/* Price drawn first (behind) as a subtle area. */}
        <Area
          yAxisId="price"
          dataKey="price"
          name="price"
          type="monotone"
          stroke="var(--color-price)"
          strokeWidth={1.5}
          fill="url(#rasid-price-fill)"
          connectNulls
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3 }}
        />

        {/* BSR line on top. */}
        <Line
          yAxisId="bsr"
          dataKey="bsr"
          name="bsr"
          type="monotone"
          stroke="var(--color-bsr)"
          strokeWidth={2}
          connectNulls
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3.5 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
