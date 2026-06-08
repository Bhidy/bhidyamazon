"use client";

import { Area, AreaChart, YAxis } from "recharts";

/**
 * Tiny BSR/price sparkline for table rows.
 * Uses explicit pixel dimensions (NOT ResponsiveContainer) — the rows render the
 * spark in a fixed-size cell, and ResponsiveContainer emitted width(-1)/height(-1)
 * warnings when it couldn't measure its parent on first paint.
 * For BSR (`invert`), the Y axis is reversed so an improving (lower) rank trends up.
 *
 * Canonical chart recipe (kept in sync with ui/chart.tsx and the product history
 * chart): two-tone green — forest `--chart-1` + lime `--chart-2`. Sparklines use a
 * lime (`--chart-2`) stroke over a soft area gradient that fades lime → transparent,
 * with rounded joins. Bar charts use rounded tops `radius={[6, 6, 0, 0]}`.
 */
export function Spark({
  data,
  invert = false,
  width = 96,
  height = 32,
}: {
  data: (number | null)[];
  invert?: boolean;
  width?: number;
  height?: number;
}) {
  const series = data.map((v, i) => ({ i, v }));
  // Unique gradient id per instance so multiple sparks on one page don't collide.
  const gradientId = `spark-lime-${width}x${height}-${invert ? "inv" : "std"}`;
  return (
    <AreaChart
      width={width}
      height={height}
      data={series}
      margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <YAxis hide domain={["dataMin", "dataMax"]} reversed={invert} />
      <Area
        type="monotone"
        dataKey="v"
        stroke="var(--chart-2)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`url(#${gradientId})`}
        dot={false}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}
