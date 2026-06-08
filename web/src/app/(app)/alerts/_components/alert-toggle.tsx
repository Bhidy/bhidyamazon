"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/lib/locale";

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
  const { locale } = useLocale();
  const isAr = locale === "ar";

  function onCheckedChange(next: boolean) {
    setEnabled(next);
    if (next) {
      toast.success(isAr ? "تم تفعيل التنبيه (عرض توضيحي)" : "Alert enabled (demo)", {
        description: productTitle,
      });
    } else {
      toast(isAr ? "تم إيقاف التنبيه (عرض توضيحي)" : "Alert paused (demo)", {
        description: productTitle,
      });
    }
  }

  return (
    <Switch
      checked={enabled}
      onCheckedChange={onCheckedChange}
      data-alert-id={alertId}
      aria-label={
        enabled
          ? (isAr ? `إيقاف تنبيه لـ ${productTitle}` : `Pause alert for ${productTitle}`)
          : (isAr ? `تفعيل تنبيه لـ ${productTitle}` : `Enable alert for ${productTitle}`)
      }
    />
  );
}
