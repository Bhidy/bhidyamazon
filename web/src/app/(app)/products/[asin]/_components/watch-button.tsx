"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * "Add to watchlist" toggle. The persistent watchlist will live in a Supabase
 * RLS table; for now this is an optimistic client-only toggle that confirms the
 * action with a toast (the global <Toaster /> is mounted in the root layout).
 */
export function WatchButton({
  asin,
  title,
}: {
  asin: string;
  title: string;
}) {
  const [watched, setWatched] = useState(false);

  function onClick() {
    const next = !watched;
    setWatched(next);
    if (next) {
      toast.success("Added to watchlist", {
        description: title,
        action: {
          label: "Undo",
          onClick: () => setWatched(false),
        },
      });
    } else {
      toast("Removed from watchlist", { description: title });
    }
  }

  return (
    <Button
      type="button"
      variant={watched ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
      data-asin={asin}
    >
      {watched ? (
        <BookmarkCheck className="size-4 text-positive" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {watched ? "Watching" : "Add to watchlist"}
    </Button>
  );
}
