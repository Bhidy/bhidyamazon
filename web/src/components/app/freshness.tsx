"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/format";

/**
 * "Updated 3h ago" freshness chip. Renders an absolute date on the server and
 * upgrades to live relative time after mount, so SSR and client never diverge.
 */
export function Freshness({
  iso,
  className,
  label = "Updated",
}: {
  iso: string;
  className?: string;
  label?: string;
}) {
  const [rel, setRel] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setRel(formatRelativeTime(iso, Date.now()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
      title={formatDate(iso, "en", { dateStyle: "medium", timeStyle: "short" } as Intl.DateTimeFormatOptions)}
    >
      <Clock className="size-3.5" />
      {label} {rel ?? formatDate(iso)}
    </span>
  );
}
