import { Info } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Freshness } from "@/components/app/freshness";
import { ButtonLink } from "@/components/app/button-link";
import {
  getDashboardSummary,
  getOpportunityContext,
  getOpportunityProducts,
} from "@/lib/data";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import { WINNING_SCORE_CONFIG } from "@/lib/winning-score";
import { WpsOverrideProvider } from "@/lib/wps-overrides";
import { NicheFilter } from "./_components/niche-filter";
import { OpportunityExplorer } from "./_components/opportunity-explorer";

const DEFAULT_NICHE = "automotive";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const category = sp.category && CATEGORY_BY_NODE[sp.category] ? sp.category : DEFAULT_NICHE;

  const products = getOpportunityProducts(category);
  const context = getOpportunityContext(category);
  const lastUpdated = getDashboardSummary("daily").lastUpdated;

  return (
    <>
      <PageHeader
        title={
          <>
            <span data-bi-en="">Opportunity Finder</span>
            <span data-bi-ar="">الفرص الرابحة</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">
              amazon.eg products scored against the winning-product filter — small, cheap, non-breakable,
              low-return, clear need, weak competition, enough demand.
            </span>
            <span data-bi-ar="">
              منتجات amazon.eg مُقيَّمة وفق فلتر المنتج الرابح — صغير، رخيص، غير قابل للكسر، إرجاع منخفض،
              حاجة واضحة، منافسة ضعيفة، طلب كافٍ.
            </span>
          </>
        }
      >
        <ButtonLink href="/settings" variant="outline" size="sm">
          <span data-bi-en="">Methodology</span>
          <span data-bi-ar="">المنهجية</span>
        </ButtonLink>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Freshness iso={lastUpdated} />
      </div>

      {/* Persistent honesty disclosure — the institutional control, never buried. */}
      <div className="flex items-start gap-2 rounded-xl border border-confidence-low/30 bg-confidence-low/[0.06] px-3.5 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-confidence-low" />
        <p>
          <span data-bi-en="">
            Each product is scored on 12 sourcing criteria.{" "}
            <span className="font-medium text-foreground">Verified facts</span> (category, size, weight, price) are
            scraped from amazon.eg; <span className="font-medium text-foreground">estimated</span> criteria (break &amp;
            return risk, sourcing, bundle) are modeled — confirm or override them per product. A score stays hidden as
            “needs review” until the key facts are known. Sourcing has no Amazon signal: use the AliExpress link, then
            confirm. Full method on the Settings page.
          </span>
          <span data-bi-ar="">
            يُقيَّم كل منتج وفق 12 معيارًا. الحقائق المؤكدة (الفئة، الحجم، الوزن، السعر) مستخلصة من amazon.eg؛ والمعايير
            التقديرية (خطر الكسر والإرجاع، التوريد، التجميع) مُقدَّرة — أكّدها أو عدّلها لكل منتج. تبقى النتيجة مخفية
            («تحتاج مراجعة») حتى تتوفر الحقائق الأساسية. لا تتوفر إشارة توريد من أمازون: استخدم رابط AliExpress ثم أكّد.
          </span>
        </p>
      </div>

      <NicheFilter active={category} />

      <WpsOverrideProvider>
        <OpportunityExplorer products={products} context={context} />
      </WpsOverrideProvider>
    </>
  );
}

export const metadata = {
  title: `Opportunity Finder — ${WINNING_SCORE_CONFIG.presetLabelEn}`,
};
