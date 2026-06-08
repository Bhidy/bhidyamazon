"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Controlled search field. Prefilled with the active query and, on submit,
 * pushes /search?q=… so the result set is fully URL-addressable (shareable,
 * back-button friendly) and re-rendered by the server component.
 */
export function SearchBox({
  initialQuery = "",
  className,
}: {
  initialQuery?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    else router.push("/search");
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={cn("flex w-full items-center gap-2", className)}
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search products on amazon.eg…"
          aria-label="Search products on amazon.eg"
          autoComplete="off"
          className="h-11 rounded-full bg-muted/60 ps-10 pe-9 shadow-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            className="absolute end-3 top-1/2 inline-flex -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <Button type="submit" variant="brand" size="lg" className="shrink-0">
        <Search className="size-4" />
        Search
      </Button>
    </form>
  );
}
