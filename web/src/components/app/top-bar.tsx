"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function LocaleToggle() {
  const [locale, setLocale] = useState<"en" | "ar">("en");
  useEffect(() => {
    const saved = (localStorage.getItem("rasid.locale") as "en" | "ar") ?? "en";
    setLocale(saved);
    document.documentElement.lang = saved;
    document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
  }, []);
  const toggle = () => {
    const next = locale === "en" ? "ar" : "en";
    setLocale(next);
    localStorage.setItem("rasid.locale", next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };
  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5" aria-label="Toggle language">
      <Languages className="size-4" />
      <span className="text-xs font-medium">{locale === "en" ? "العربية" : "EN"}</span>
    </Button>
  );
}

export function TopBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-sm md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="relative w-full max-w-md"
      >
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any amazon.eg product…"
          className="h-9 ps-8"
          aria-label="Search products"
        />
      </form>
      <div className="ms-auto flex items-center gap-1.5">
        <Badge variant="outline" className="hidden gap-1.5 font-normal sm:inline-flex">
          <span className="size-1.5 rounded-full bg-confidence-medium" />
          Free tier
        </Badge>
        <LocaleToggle />
      </div>
    </header>
  );
}
