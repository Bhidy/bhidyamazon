import {
  Ban,
  Database,
  FileText,
  Globe,
  HardDriveDownload,
  Info,
  Languages,
  Receipt,
  ShieldCheck,
  UserX,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/app/page-header";
import { ConfidenceBadge } from "@/components/app/confidence";
import { DEFAULT_FEE_SCHEDULE } from "@/lib/fees";
import { DISCLOSURE, MARKETPLACE } from "@/lib/constants";
import { formatDate, formatEgp, formatPct } from "@/lib/format";
import type { FbaRung, ReferralRule } from "@/lib/types";

/**
 * Settings — a read-mostly, honest account of how Rasid sources its data, the
 * fee assumptions behind every profit number, and the language model.
 *
 * This is a pure async Server Component: there is no client state. Inputs are
 * rendered `disabled` to communicate that fields *would* be editable in a
 * configured deployment, without implying that edits persist in this build.
 */

/** The legal/operational guardrails the scraper runs under (docs/research/01). */
const GUARDRAILS: { icon: typeof UserX; label: string; detail: string }[] = [
  {
    icon: UserX,
    label: "Logged-out only",
    detail:
      "Only public, signed-out pages are read — never an authenticated account, cart, or order history.",
  },
  {
    icon: ShieldCheck,
    label: "No personal data",
    detail:
      "Reviewer names and any personal information are dropped at ingest; only aggregate signals are kept.",
  },
  {
    icon: HardDriveDownload,
    label: "Private cache",
    detail:
      "Fetched pages live in a private local cache for your own research — they are never redistributed.",
  },
  {
    icon: FileText,
    label: "Personal-use scope",
    detail:
      "Intended for personal product research, not a resale data product or a public API.",
  },
  {
    icon: Ban,
    label: "Stop on block",
    detail:
      "If amazon.eg rate-limits or blocks a request, collection backs off and stops rather than evading.",
  },
];

/** Turn a referral rule's piecewise tiers into a human sentence. */
function humanizeTiers(rule: ReferralRule): string {
  if (rule.tiers.length === 1) {
    return formatPct(rule.tiers[0].rate, "en", { fromRatio: true });
  }
  return rule.tiers
    .map((tier, i) => {
      const rate = formatPct(tier.rate, "en", { fromRatio: true });
      if (tier.uptoEgp != null) {
        const cap = formatEgp(tier.uptoEgp, "en", { decimals: 0 });
        return `${rate} ≤ ${cap}`;
      }
      // The final, open-ended tier.
      return i === 0 ? rate : `then ${rate}`;
    })
    .join(", ");
}

export default async function SettingsPage() {
  const schedule = DEFAULT_FEE_SCHEDULE;

  return (
    <>
      <PageHeader
        title="Settings"
        description="How Rasid sources data, the fee assumptions behind every profit number, and the language model — stated plainly."
      />

      {/* ───────────────────────── Data source ───────────────────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-foreground">
              <Database className="size-4.5" />
            </span>
            <CardTitle className="text-base">Data source</CardTitle>
          </div>
          <CardDescription>
            Where the numbers come from, and the rules collection runs under.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-confidence-medium/15 py-1 ps-2 pe-3 text-sm font-medium text-confidence-medium">
                <span className="relative inline-flex size-2.5 items-center justify-center">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-confidence-medium/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-confidence-medium" />
                </span>
                Free / best-effort scraping
              </span>
              <p className="max-w-xl text-sm text-muted-foreground">
                Public amazon.eg pages are read on a best-effort basis. There is no paid
                data feed behind these numbers — accuracy and freshness depend on what the
                site serves to a logged-out visitor.
              </p>
            </div>
          </div>

          <Separator />

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Marketplace</dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Globe className="size-3.5 text-muted-foreground/70" />
                {MARKETPLACE.domain}
              </dd>
            </div>
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Marketplace ID</dt>
              <dd className="font-mono text-sm tabular-nums text-foreground">
                {MARKETPLACE.marketplaceId}
              </dd>
            </div>
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Currency</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {MARKETPLACE.currency}
              </dd>
            </div>
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Scrape cadence</dt>
              <dd className="text-sm font-medium text-foreground">
                Roughly daily, throttled
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            Best-seller and movers lists are sampled about once a day at a deliberately
            slow rate; individual products refresh when you open them. Snapshots build the
            rank and price history over time — there is no real-time feed.
          </p>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Legal &amp; ethical guardrails</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {GUARDRAILS.map(({ icon: Icon, label, detail }) => (
                <li
                  key={label}
                  className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3 shadow-card"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Alert>
            <Info />
            <AlertTitle>Reliability is best-effort</AlertTitle>
            <AlertDescription>
              <p>
                On a free, logged-out scrape, amazon.eg may rate-limit, block, or serve
                partial pages, so coverage and freshness can vary. For a more reliable feed,
                a residential-proxy upgrade (about{" "}
                <span className="font-medium text-foreground tabular-nums">$5/mo</span>) is
                available to reduce blocking and stabilise collection. It changes resilience
                only — never the honest-data labelling.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ───────────────────────── Fee schedule ───────────────────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-confidence-medium/15 text-confidence-medium">
                <Receipt className="size-4.5" />
              </span>
              <CardTitle className="text-base">Fee schedule</CardTitle>
              <ConfidenceBadge
                confidence="medium"
                note="Researched defaults — spot-confirm before relying on the numbers."
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              As of {formatDate(schedule.asOf)}
            </span>
          </div>
          <CardDescription>
            The rates that drive the profit calculator. Editable in a configured deployment;
            shown read-only here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-5">
          <Alert>
            <Info />
            <AlertTitle>These fees are estimates</AlertTitle>
            <AlertDescription>{DISCLOSURE.estimatedFeesEn}</AlertDescription>
          </Alert>

          {/* Global fee constants — look editable, are disabled. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee-vat" className="text-xs text-muted-foreground">
                VAT rate
              </Label>
              <Input
                id="fee-vat"
                disabled
                readOnly
                defaultValue={formatPct(schedule.vatRate, "en", { fromRatio: true })}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee-band" className="text-xs text-muted-foreground">
                FBA price band
              </Label>
              <Input
                id="fee-band"
                disabled
                readOnly
                defaultValue={formatEgp(schedule.fbaPriceBandEgp, "en", { decimals: 0 })}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee-storage" className="text-xs text-muted-foreground">
                Storage / cu ft / month
              </Label>
              <Input
                id="fee-storage"
                disabled
                readOnly
                defaultValue={formatEgp(schedule.storageEgpPerCuFtMonth, "en", { decimals: 0 })}
                className="tabular-nums"
              />
            </div>
          </div>

          {/* Referral fees */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Referral fees by category</h3>
            <p className="text-xs text-muted-foreground">
              Charged on the sale price. Tiered categories apply each rate to the portion of
              the price within its band.
            </p>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="ps-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Category
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Referral rate
                    </TableHead>
                    <TableHead className="pe-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Min fee
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.referral.map((rule: ReferralRule) => (
                    <TableRow key={rule.categoryNode ?? rule.category}>
                      <TableCell className="ps-4 font-medium text-foreground">
                        {rule.category}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {humanizeTiers(rule)}
                      </TableCell>
                      <TableCell className="pe-4 text-right tabular-nums text-foreground">
                        {rule.minFeeEgp != null
                          ? formatEgp(rule.minFeeEgp, "en", { decimals: 0 })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* FBA ladder */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">FBA fulfilment ladder</h3>
            <p className="text-xs text-muted-foreground">
              Per-unit fulfilment fee by size tier. The low fee applies at or below the{" "}
              {formatEgp(schedule.fbaPriceBandEgp, "en", { decimals: 0 })} price band; the
              high fee applies above it.
            </p>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="ps-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Size tier
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Max weight
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fee ≤ band
                    </TableHead>
                    <TableHead className="pe-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fee &gt; band
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.fbaLadder.map((rung: FbaRung) => (
                    <TableRow key={rung.sizeTier}>
                      <TableCell className="ps-4 font-medium text-foreground">{rung.label}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {rung.maxWeightKg} kg
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {formatEgp(rung.lowPriceFeeEgp, "en", { decimals: 0 })}
                      </TableCell>
                      <TableCell className="pe-4 text-right tabular-nums text-foreground">
                        {formatEgp(rung.highPriceFeeEgp, "en", { decimals: 0 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Source: {schedule.provenance.source}. {schedule.provenance.note}
          </p>
        </CardContent>
      </Card>

      {/* ───────────────────────── Language ───────────────────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-foreground">
              <Languages className="size-4.5" />
            </span>
            <CardTitle className="text-base">Language</CardTitle>
          </div>
          <CardDescription>English and Arabic, with right-to-left support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">English</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {MARKETPLACE.languages.en}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Default interface language, laid out left-to-right.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground" dir="rtl">
                  <span className="font-arabic">العربية</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {MARKETPLACE.languages.ar}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Full Arabic interface with right-to-left (RTL) layout and Arabic-Indic digits.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Arabic product titles and search terms are always shown in their original script
            alongside the English data. To switch the interface language, use the language
            toggle in the top bar — the choice applies across every screen.
          </p>
        </CardContent>
      </Card>

      {/* ───────────────────────── About ───────────────────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-foreground">
              <Info className="size-4.5" />
            </span>
            <CardTitle className="text-base">About Rasid</CardTitle>
          </div>
          <CardDescription>Honest product research for amazon.eg.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm leading-relaxed text-foreground/90">
            Rasid is an institutional-grade product-research and arbitrage workbench for
            Amazon Egypt. It ranks what is selling and rising, tracks rank and price over
            time, estimates relative demand, and runs the fee-and-VAT math that decides
            whether a margin survives — all from free, public signals.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Its guiding principle is honesty about uncertainty: ranks and demand are framed
            as relative indicators, never as exact units sold or search volume, and every
            modeled value is labelled with its confidence tier. The fee engine is the one
            pillar built on deterministic math rather than estimation.
          </p>
          <Separator />
          <div className="flex items-start gap-2.5">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">
              The methodology, marketplace facts, fee research, and audit findings behind this
              build live in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                /docs/research
              </code>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
