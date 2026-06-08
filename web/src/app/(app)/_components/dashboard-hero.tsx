import { ArrowUpRight, Calculator, Trophy } from "lucide-react";
import { ButtonLink } from "@/components/app/button-link";
import { Freshness } from "@/components/app/freshness";
import { formatNumber } from "@/lib/format";
import type { DashboardSummary } from "@/lib/data";

export function DashboardHero({ summary: s }: { summary: DashboardSummary }) {
  return (
    <section
      aria-label="Tracking overview"
      className="relative isolate overflow-hidden rounded-[1.75rem] bg-hero-lime text-brand-foreground shadow-card-lg"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -end-10 -top-16 -z-10 size-72 rounded-full bg-white/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 start-1/3 -z-10 size-64 rounded-full bg-white/10 blur-3xl"
      />

      <div className="flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <Freshness
            iso={s.lastUpdated}
            className="bg-brand-foreground/10 text-brand-foreground/80 [&_svg]:text-brand-foreground"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-brand-foreground/75">
              <span data-bi-en="">Tracking amazon.eg best sellers</span>
              <span data-bi-ar="">متابعة أفضل منتجات amazon.eg</span>
            </p>
            <h2 className="text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
              {formatNumber(s.productsTracked)}{" "}
              <span className="text-2xl font-semibold text-brand-foreground/70 md:text-3xl">
                <span data-bi-en="">products tracked</span>
                <span data-bi-ar="">منتج متتبع</span>
              </span>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <ButtonLink
            href="/calculator"
            size="lg"
            className="border border-brand-foreground/25 bg-brand-foreground/10 text-brand-foreground hover:bg-brand-foreground/20"
          >
            <Calculator className="size-4" />
            <span data-bi-en="">Run a profit check</span>
            <span data-bi-ar="">احسب الربح</span>
          </ButtonLink>
          <ButtonLink
            href="/bestsellers"
            size="lg"
            className="bg-brand-foreground text-brand shadow-none hover:bg-brand-foreground/90"
          >
            <Trophy className="size-4" />
            <span data-bi-en="">Browse best sellers</span>
            <span data-bi-ar="">تصفح الأكثر مبيعاً</span>
            <ArrowUpRight className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
