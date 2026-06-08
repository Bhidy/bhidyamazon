"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

/**
 * "New list" action. Multiple named lists will be Supabase RLS rows; for now
 * this confirms the (stubbed) action with a toast and points the user at the
 * catalogue to start adding products (the global <Toaster /> is in the root
 * layout). Kept as a tiny client component so the page stays a Server Component.
 */
export function NewListButton() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  function onClick() {
    toast.success(isAr ? "القائمة جاهزة" : "New list ready", {
      description: isAr
        ? "أضف منتجات من الكتالوج لبدء متابعتها هنا."
        : "Add products from the catalogue to start tracking them here.",
      action: {
        label: isAr ? "تصفح المنتجات" : "Browse products",
        onClick: () => {
          window.location.href = "/products";
        },
      },
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Plus className="size-4" />
      {isAr ? "قائمة جديدة" : "New list"}
    </Button>
  );
}
