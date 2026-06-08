import { PageHeader } from "@/components/app/page-header";
import { CATEGORIES } from "@/lib/constants";
import { CalculatorForm } from "./_components/calculator-form";

/**
 * Profit & VAT calculator — Rasid's most trustworthy pillar.
 *
 * Unlike the rank/demand screens (which surface modeled estimates), this screen
 * is deterministic math on a versioned, EG-specific fee schedule. The two
 * correctness traps the audit calls out are handled by `computeProfit` and made
 * visible in the UI: the consumer price is VAT-inclusive (a registered seller's
 * revenue = price / 1.14) and Amazon charges 14% VAT on top of its own fees.
 *
 * The page itself is a thin async Server Component: it resolves the (Promise)
 * search params for deep-linkable presets and hands them to the client form,
 * which owns all interactivity and recomputes on every keystroke.
 */
export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ price?: string; category?: string }>;
}) {
  const sp = await searchParams;

  const parsedPrice = Number(sp.price);
  const initialPrice =
    sp.price != null && Number.isFinite(parsedPrice) && parsedPrice > 0
      ? Math.round(parsedPrice)
      : undefined;

  const initialCategory =
    sp.category && CATEGORIES.some((c) => c.nodeId === sp.category)
      ? sp.category
      : CATEGORIES[0].nodeId;

  return (
    <>
      <PageHeader
        title="Profit Calculator"
        description="Will the margin survive Amazon Egypt's fees and 14% VAT? Run it before you source."
      />

      <CalculatorForm initialPrice={initialPrice} initialCategory={initialCategory} />
    </>
  );
}
