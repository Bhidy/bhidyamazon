"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Languages, Search, Settings } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-md md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="relative w-full max-w-md"
      >
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any amazon.eg product…"
          className="h-10 rounded-full border-transparent bg-muted/60 ps-9.5 shadow-none focus-visible:bg-card"
          aria-label="Search products"
        />
      </form>
      <div className="ms-auto flex items-center gap-1.5">
        <LocaleToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/settings" />}
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </Button>
        <div
          className="ms-0.5 hidden size-9 shrink-0 rounded-full bg-hero-lime ring-1 ring-border/60 sm:block"
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
