import { Radar, SearchX } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { CalibrationNotice } from "@/components/app/calibration-notice";
import { ConfidenceBadge } from "@/components/app/confidence";
import { DemandTrendChip } from "@/components/app/demand-trend-chip";
import { getKeywords } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { DISCLOSURE } from "@/lib/constants";
import { LangFilter } from "./_components/lang-filter";

const LANGS = ["all", "en", "ar"] as const;
type LangScope = (typeof LANGS)[number];

/**
 * Ordinal prominence tier derived from how high the term sits in Amazon's
 * autocomplete list (demandScore is a position re-encoding, NOT a magnitude).
 * Top = appears at the very top of suggestions; lower tiers sit further down.
 * Deliberately a WORD, so the value can never be read as a demand quantity.
 */
function prominenceTier(score: number): { label: string; cls: string } {
  if (score >= 100) return { label: "Top", cls: "text-confidence-low border-confidence-low/30 bg-confidence-low/10" };
  if (score >= 84) return { label: "High", cls: "text-muted-foreground border-border bg-muted/40" };
  return { label: "Medium", cls: "text-muted-foreground border-border bg-muted/40" };
}

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = (LANGS.includes(sp.lang as LangScope) ? sp.lang : "all") as LangScope;

  // getKeywords returns rows already sorted desc by demandScore.
  const keywords = getKeywords({ lang: lang === "all" ? undefined : lang });

  return (
    <>
      <PageHeader
        title="Demand Radar"
        description="How prominently amazon.eg suggests each term in search autocomplete — an ordinal prominence signal, not search volume or demand quantity."
      >
        <LangFilter value={lang} />
      </PageHeader>

      <Alert className="border-confidence-low/30 bg-confidence-low/[0.07]">
        <Radar className="text-confidence-low" />
        <AlertTitle className="flex flex-wrap items-center gap-2">
          Autocomplete prominence — not search volume or demand quantity
          <ConfidenceBadge
            confidence="low"
            note="Sourced from Amazon search autocomplete prefixes — an ordinal prominence signal only."
          />
        </AlertTitle>
        <AlertDescription>
          {DISCLOSURE.demandProxyEn} The prominence tier reflects how high a term
          sits in amazon.eg autocomplete suggestions relative to others — i.e. how
          prominently Amazon suggests it. It is an ordinal ranking, never a count of
          searches, units, or demand, and is not comparable to a true search-volume
          figure.
        </AlertDescription>
      </Alert>

      <Card className="gap-0">
        <CardHeader className="flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Radar className="size-4 text-brand" />
            <CardTitle className="text-base">Tracked keywords</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {keywords.length} {keywords.length === 1 ? "term" : "terms"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {keywords.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-4 text-end text-muted-foreground">#</TableHead>
                  <TableHead className="text-muted-foreground">Keyword</TableHead>
                  <TableHead className="w-[34%] min-w-52 text-muted-foreground">
                    Autocomplete prominence
                  </TableHead>
                  <TableHead className="text-muted-foreground">Trend</TableHead>
                  <TableHead className="pr-4 text-end text-muted-foreground">
                    Appearances
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((k, i) => {
                  const isAr = k.lang === "ar";
                  return (
                    <TableRow key={k.query}>
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
                                className="h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-muted"
                                role="meter"
                                aria-valuenow={k.demandScore}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Autocomplete prominence: ${tier.label} (rank signal, not search volume)`}
                              >
                                <div
                                  className="h-full rounded-full bg-confidence-low"
                                  style={{ width: `${k.demandScore}%` }}
                                />
                              </div>
                              <span
                                className={`inline-flex w-16 shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium leading-none ${tier.cls}`}
                              >
                                {tier.label}
                              </span>
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
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
              <SearchX className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No keywords in this language</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                No autocomplete terms surfaced for the selected language scope. Try
                widening to all languages.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CalibrationNotice />
    </>
  );
}
