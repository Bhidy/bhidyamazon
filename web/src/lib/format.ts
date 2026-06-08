/** Locale-aware formatters. EGP currency, Arabic-Indic digits, dates, ranks. */

import type { Locale } from "@/lib/types";

const localeTag = (l: Locale) => (l === "ar" ? "ar-EG" : "en-US");

/** Format an EGP amount. Whole numbers drop decimals; fractions keep two. */
export function formatEgp(
  value: number | null | undefined,
  locale: Locale = "en",
  opts: { decimals?: number; compact?: boolean } = {},
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const decimals = opts.decimals ?? (Number.isInteger(value) ? 0 : 2);
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: opts.compact ? "compact" : "standard",
  }).format(value);
}

export function formatNumber(
  value: number | null | undefined,
  locale: Locale = "en",
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(localeTag(locale), {
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.decimals ?? (opts.compact ? 1 : 0),
  }).format(value);
}

/** Percentage from a ratio (0.14 → "14%") or already-scaled value. */
export function formatPct(
  value: number | null | undefined,
  locale: Locale = "en",
  opts: { fromRatio?: boolean; decimals?: number; signed?: boolean } = {},
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const v = opts.fromRatio ? value : value / 100;
  const formatted = new Intl.NumberFormat(localeTag(locale), {
    style: "percent",
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 1,
    signDisplay: opts.signed ? "exceptZero" : "auto",
  }).format(v);
  return formatted;
}

/** Best Seller Rank, e.g. "#1,234". */
export function formatRank(rank: number | null | undefined, locale: Locale = "en"): string {
  if (rank == null || Number.isNaN(rank)) return "—";
  return "#" + new Intl.NumberFormat(localeTag(locale)).format(rank);
}

export function formatDate(
  iso: string | null | undefined,
  locale: Locale = "en",
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag(locale), opts).format(d);
}

/**
 * Relative time ("2d ago"). `nowMs` is injected so callers can keep renders
 * deterministic / testable.
 */
export function formatRelativeTime(
  iso: string | null | undefined,
  nowMs: number,
  locale: Locale = "en",
): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.round((then - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: "auto", style: "short" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), "month");
  return rtf.format(Math.round(diffSec / 31536000), "year");
}

/** Star rating to one decimal ("4.6"). */
export function formatRating(rating: number | null | undefined, locale: Locale = "en"): string {
  if (rating == null || Number.isNaN(rating)) return "—";
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}
