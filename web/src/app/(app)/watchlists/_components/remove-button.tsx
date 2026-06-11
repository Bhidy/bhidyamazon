"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

/**
 * Removes an item from the persistent watchlist (localStorage store). The
 * parent wires `onRemove` to the store's remove and `onRestore` to a re-add,
 * so the toast's Undo genuinely restores the entry — not just the card.
 */
export function RemoveButton({
  title,
  onRemove,
  onRestore,
}: {
  /** Product title — shown in the confirmation toast. */
  title: string;
  /** Hide the card. */
  onRemove: () => void;
  /** Restore the card (wired to the toast's Undo action). */
  onRestore: () => void;
}) {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  function onClick() {
    onRemove();
    toast(isAr ? "أُزيل من قائمة المتابعة" : "Removed from watchlist", {
      description: title,
      action: {
        label: isAr ? "تراجع" : "Undo",
        onClick: onRestore,
      },
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground hover:text-destructive"
      aria-label={
        isAr
          ? `إزالة ${title} من قائمة المتابعة`
          : `Remove ${title} from watchlist`
      }
    >
      <Trash2 className="size-3.5" />
      {isAr ? "إزالة" : "Remove"}
    </Button>
  );
}
