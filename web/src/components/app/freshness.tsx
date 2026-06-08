"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { useLocale } from "@/lib/locale";

/**
 * "Updated 3h ago" freshness chip. Renders an absolute date on the server and
 * upgrades to live relative time after mount, so SSR and client never diverge.
 */
export function Freshness({
  iso,
  className,
  label,
}: {
  iso: string;
  className?: string;
  label?: string;
}) {
  const [rel, setRel] = useState<string | null>(null);
  const { locale } = useLocale();
  const isAr = locale === "ar";

  useEffect(() => {
    const tick = () => setRel(formatRelativeTime(iso, Date.now()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  const defaultLabel = label ?? (isAr ? "تحديث" : "Updated");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums",
        className,
      )}
      title={formatDate(iso, "en", { dateStyle: "medium", timeStyle: "short" } as Intl.DateTimeFormatOptions)}
    >
      <Clock className="size-3.5 text-positive" />
      {defaultLabel} {rel ?? formatDate(iso)}
    </span>
  );
}
