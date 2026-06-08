"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

/**
 * Per-row enable/disable toggle for an alert.
 *
 * Alert state will live in a Supabase RLS table; for now this is an optimistic
 * client-only switch that confirms the change with a toast (the global
 * <Toaster /> is mounted in the root layout). Kept as a tiny client component
 * so the Alerts page itself stays a Server Component.
 */
export function AlertToggle({
  alertId,
  productTitle,
  active,
}: {
  alertId: string;
  productTitle: string;
  active: boolean;
}) {
  const [enabled, setEnabled] = useState(active);

  function onCheckedChange(next: boolean) {
    setEnabled(next);
    if (next) {
      toast.success("Alert enabled (demo)", { description: productTitle });
    } else {
      toast("Alert paused (demo)", { description: productTitle });
    }
  }

  return (
    <Switch
      checked={enabled}
      onCheckedChange={onCheckedChange}
      data-alert-id={alertId}
      aria-label={
        enabled
          ? `Pause alert for ${productTitle}`
          : `Enable alert for ${productTitle}`
      }
    />
  );
}
