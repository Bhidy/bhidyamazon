import { Radar, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { DemandTrendChip } from "@/components/app/demand-trend-chip";
import { getKeywords } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { LangFilter } from "./_components/lang-filter";

const LANGS = ["all", "en", "ar"] as const;
type LangScope = (typeof LANGS)[number];

function prominenceTier(
  score: number,
): { labelEn: string; labelAr: string; variant: "brand" | "secondary" } {
  if (score >= 100) return { labelEn: "Top", labelAr: "الأول", variant: "brand" };
  if (score >= 84) return { labelEn: "High", labelAr: "مرتفع", variant: "secondary" };
  return { labelEn: "Medium", labelAr: "متوسط", variant: "secondary" };
}

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = (LANGS.includes(sp.lang as LangScope) ? sp.lang : "all") as LangScope;

  const keywords = getKeywords({ lang: lang === "all" ? undefined : lang });

  return (
    <>
      <PageHeader
        title={
          <>
            <span data-bi-en="">Demand Radar</span>
            <span data-bi-ar="">رادار الطلب</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">How prominently amazon.eg suggests each term in search autocomplete — an ordinal prominence signal, not search volume or demand quantity.</span>
            <span data-bi-ar="">مدى بروز كل مصطلح في الإكمال التلقائي لـ amazon.eg — إشارة بروز ترتيبية، لا حجم بحث أو كمية طلب.</span>
          </>
        }
      >
        <LangFilter value={lang} />
      </PageHeader>

      <Card className="gap-0">
        <CardHeader className="flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-foreground">
              <Radar className="size-4" />
            </span>
            <CardTitle className="text-base">
              <span data-bi-en="">Tracked keywords</span>
              <span data-bi-ar="">الكلمات المفتاحية المتتبعة</span>
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            <span data-bi-en="">
              {keywords.length} {keywords.length === 1 ? "term" : "terms"}
            </span>
            <span data-bi-ar="">
              {keywords.length} {keywords.length === 1 ? "مصطلح" : "مصطلحات"}
            </span>
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {keywords.length ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b hover:bg-transparent [&>th]:h-9 [&>th]:text-[0.6875rem] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                  <TableHead className="w-10 pl-4 text-end">#</TableHead>
                  <TableHead>
                    <span data-bi-en="">Keyword</span>
                    <span data-bi-ar="">الكلمة المفتاحية</span>
                  </TableHead>
                  <TableHead className="w-[34%] min-w-52">
                    <span data-bi-en="">Autocomplete prominence</span>
                    <span data-bi-ar="">بروز الإكمال التلقائي</span>
                  </TableHead>
                  <TableHead>
                    <span data-bi-en="">Trend</span>
                    <span data-bi-ar="">الاتجاه</span>
                  </TableHead>
                  <TableHead className="pr-4 text-end">
                    <span data-bi-en="">Appearances</span>
                    <span data-bi-ar="">الظهورات</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((k, i) => {
                  const isAr = k.lang === "ar";
                  return (
                    <TableRow
                      key={k.query}
                      className="border-border/60 transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="pl-4 text-end text-xs font-medium tabular-nums text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <span
                          dir={isAr ? "rtl" : "ltr"}
                          className={isAr ? "font-arabic font-medium" : "font-medium"}
                        >
                          {k.query}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const tier = prominenceTier(k.demandScore);
                          return (
                            <div className="flex items-center gap-2.5">
                              <div
                                className="h-2 w-full max-w-32 overflow-hidden rounded-full bg-muted"
                                role="meter"
                                aria-valuenow={k.demandScore}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Autocomplete prominence: ${tier.labelEn} (rank signal, not search volume)`}
                              >
                                <div
                                  className="h-full rounded-full bg-brand"
                                  style={{ width: `${k.demandScore}%` }}
                                />
                              </div>
                              <Badge
                                variant={tier.variant}
                                className="w-16 justify-center"
                              >
                                <span data-bi-en="">{tier.labelEn}</span>
                                <span data-bi-ar="">{tier.labelAr}</span>
                              </Badge>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <DemandTrendChip trend={k.trend} />
                      </TableCell>
                      <TableCell className="pr-4 text-end text-sm tabular-nums">
                        {formatNumber(k.appearances)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <SearchX className="size-5" />
              </span>
              <p className="text-sm font-medium">
                <span data-bi-en="">No keywords in this language</span>
                <span data-bi-ar="">لا توجد كلمات مفتاحية بهذه اللغة</span>
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                <span data-bi-en="">No autocomplete terms surfaced for the selected language scope. Try widening to all languages.</span>
                <span data-bi-ar="">لم تظهر أي مصطلحات إكمال تلقائي لنطاق اللغة المحدد. جرب التوسيع إلى جميع اللغات.</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
