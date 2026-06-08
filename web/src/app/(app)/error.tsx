"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <TriangleAlert className="size-8 text-confidence-medium" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          <span data-bi-en="">Something went wrong</span>
          <span data-bi-ar="">حدث خطأ ما</span>
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || (
            <>
              <span data-bi-en="">An unexpected error occurred while loading this view.</span>
              <span data-bi-ar="">حدث خطأ غير متوقع أثناء تحميل هذا العرض.</span>
            </>
          )}
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        <span data-bi-en="">Try again</span>
        <span data-bi-ar="">حاول مجدداً</span>
      </Button>
    </div>
  );
}
