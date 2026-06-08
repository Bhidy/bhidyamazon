import { ArrowUpRight, Calculator, Trophy } from "lucide-react";
import { ButtonLink } from "@/components/app/button-link";
import { Freshness } from "@/components/app/freshness";
import type { DashboardSummary } from "@/lib/data";

/**
 * Signature lime gradient hero for the dashboard. Surfaces ONLY existing
 * `getDashboardSummary` data (products tracked + freshness headline, top riser /
 * avg rating / categories as chips) and links to existing routes — purely a
 * visual reframing of data already shown elsewhere on the page.
 */
export function DashboardHero({ summary: s }: { summary: DashboardSummary }) {
  return (
    <section
      aria-label="Tracking overview"
      className="relative isolate overflow-hidden rounded-[1.75rem] bg-hero-lime text-brand-foreground shadow-card-lg"
    >
      {/* Subtle abstract swirl — purely decorative, sits behind the content. */}
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
              Tracking amazon.eg best sellers
            </p>
            <h2 className="text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
              {s.productsTracked.toLocaleString()}{" "}
              <span className="text-2xl font-semibold text-brand-foreground/70 md:text-3xl">
                products tracked
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
            Run a profit check
          </ButtonLink>
          <ButtonLink
            href="/bestsellers"
            size="lg"
            className="bg-brand-foreground text-brand shadow-none hover:bg-brand-foreground/90"
          >
            <Trophy className="size-4" />
            Browse best sellers
            <ArrowUpRight className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
