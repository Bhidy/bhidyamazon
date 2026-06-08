"use client";

import { Line, LineChart, YAxis } from "recharts";

/**
 * Tiny BSR/price sparkline for table rows.
 * Uses explicit pixel dimensions (NOT ResponsiveContainer) — the rows render the
 * spark in a fixed-size cell, and ResponsiveContainer emitted width(-1)/height(-1)
 * warnings when it couldn't measure its parent on first paint.
 * For BSR (`invert`), the Y axis is reversed so an improving (lower) rank trends up.
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
  const first = data.find((v) => v != null) ?? 0;
  const last = [...data].reverse().find((v) => v != null) ?? 0;
  const good = invert ? last < first : last > first;
  const color = good ? "var(--positive)" : "var(--falling)";
  return (
    <LineChart
      width={width}
      height={height}
      data={series}
      margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
    >
      <YAxis hide domain={["dataMin", "dataMax"]} reversed={invert} />
      <Line
        type="monotone"
        dataKey="v"
        stroke={color}
        strokeWidth={1.75}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
