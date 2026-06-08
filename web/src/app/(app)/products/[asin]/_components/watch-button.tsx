"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

export function WatchButton({
  asin,
  title,
}: {
  asin: string;
  title: string;
}) {
  const [watched, setWatched] = useState(false);
  const { locale } = useLocale();
  const isAr = locale === "ar";

  function onClick() {
    const next = !watched;
    setWatched(next);
    if (next) {
      toast.success(isAr ? "أُضيف إلى قائمة المتابعة" : "Added to watchlist", {
        description: title,
        action: {
          label: isAr ? "تراجع" : "Undo",
          onClick: () => setWatched(false),
        },
      });
    } else {
      toast(isAr ? "أُزيل من قائمة المتابعة" : "Removed from watchlist", { description: title });
    }
  }

  return (
    <Button
      type="button"
      variant={watched ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      aria-pressed={watched}
      aria-label={
        watched
          ? (isAr ? `إزالة ${title} من قائمة المتابعة` : `Remove ${title} from watchlist`)
          : (isAr ? `إضافة ${title} إلى قائمة المتابعة` : `Add ${title} to watchlist`)
      }
      data-asin={asin}
    >
      {watched ? (
        <BookmarkCheck className="size-4 text-positive" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {watched
        ? (isAr ? "تتم المتابعة" : "Watching")
        : (isAr ? "أضف للمتابعة" : "Add to watchlist")}
    </Button>
  );
}
