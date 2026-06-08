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
  Target,
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
import { WINNING_SCORE_CONFIG } from "@/lib/winning-score";
import { DISCLOSURE, MARKETPLACE } from "@/lib/constants";
import { formatDate, formatEgp, formatPct } from "@/lib/format";
import type { FbaRung, ReferralRule } from "@/lib/types";

const GUARDRAILS: { icon: typeof UserX; labelEn: string; labelAr: string; detailEn: string; detailAr: string }[] = [
  {
    icon: UserX,
    labelEn: "Logged-out only",
    labelAr: "بدون تسجيل دخول فقط",
    detailEn: "Only public, signed-out pages are read — never an authenticated account, cart, or order history.",
    detailAr: "تُقرأ الصفحات العامة فقط بدون تسجيل دخول — ليس حساباً موثقاً أو سلة تسوق أو تاريخ طلبات.",
  },
  {
    icon: ShieldCheck,
    labelEn: "No personal data",
    labelAr: "بدون بيانات شخصية",
    detailEn: "Reviewer names and any personal information are dropped at ingest; only aggregate signals are kept.",
    detailAr: "تُحذف أسماء المراجعين وأي معلومات شخصية عند الاستيعاب؛ تُحفظ الإشارات المجمعة فقط.",
  },
  {
    icon: HardDriveDownload,
    labelEn: "Private cache",
    labelAr: "ذاكرة تخزين خاصة",
    detailEn: "Fetched pages live in a private local cache for your own research — they are never redistributed.",
    detailAr: "الصفحات المُجلَبة تبقى في ذاكرة تخزين محلية خاصة لأبحاثك — لا تُعاد توزيعها أبداً.",
  },
  {
    icon: FileText,
    labelEn: "Personal-use scope",
    labelAr: "نطاق الاستخدام الشخصي",
    detailEn: "Intended for personal product research, not a resale data product or a public API.",
    detailAr: "مخصص لأبحاث المنتجات الشخصية، لا لمنتج بيانات إعادة البيع أو واجهة برمجية عامة.",
  },
  {
    icon: Ban,
    labelEn: "Stop on block",
    labelAr: "توقف عند الحجب",
    detailEn: "If amazon.eg rate-limits or blocks a request, collection backs off and stops rather than evading.",
    detailAr: "إذا قيّدت amazon.eg معدل الطلبات أو حجبت طلباً، يتوقف الجمع بدلاً من التحايل.",
  },
];

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
      return i === 0 ? rate : `then ${rate}`;
    })
    .join(", ");
}

const WPS_TYPE_META: Record<string, { en: string; ar: string; cls: string }> = {
  measured: { en: "Measured", ar: "مقيس", cls: "text-confidence-high bg-confidence-high/12" },
  relative: { en: "Relative", ar: "نسبي", cls: "text-confidence-medium bg-confidence-medium/15" },
  inferred: { en: "Inferred", ar: "مُستنتَج", cls: "text-confidence-low bg-confidence-low/15" },
  assisted: { en: "Assisted", ar: "مُساعَد", cls: "text-muted-foreground bg-muted" },
};
const WPS_KIND: Record<string, keyof typeof WPS_TYPE_META> = {
  category: "measured",
  size: "measured",
  weight: "measured",
  material: "measured",
  price: "measured",
  competition: "relative",
  demand: "relative",
  breakRisk: "inferred",
  returnRisk: "inferred",
  useCaseClarity: "inferred",
  bundle: "inferred",
  sourcing: "assisted",
};

export default async function SettingsPage() {
  const schedule = DEFAULT_FEE_SCHEDULE;
  const wpsGatePct = Math.round(WINNING_SCORE_CONFIG.minCompleteness * 100);

  return (
    <>
      <PageHeader
        title={
          <>
            <span data-bi-en="">Settings</span>
            <span data-bi-ar="">الإعدادات</span>
          </>
        }
        description={
          <>
            <span data-bi-en="">How Rasid sources data, the fee assumptions behind every profit number, and the language model — stated plainly.</span>
            <span data-bi-ar="">كيف تحصل رصيد على البيانات، وافتراضات الرسوم وراء كل رقم ربح، ونموذج اللغة — بوضوح تام.</span>
          </>
        }
      />

      {/* ───────────── Winning Product Score methodology ───────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-foreground">
              <Target className="size-4.5" />
            </span>
            <CardTitle className="text-base">
              <span data-bi-en="">Opportunity Finder — how the score works</span>
              <span data-bi-ar="">الفرص الرابحة — كيف تُحتسب النتيجة</span>
            </CardTitle>
          </div>
          <CardDescription>
            <span data-bi-en="">
              Every candidate is scored 0–100 across 12 sourcing criteria, weighted as below. The composite uses only
              the criteria that can actually be evaluated, and is hidden as “needs review” below {wpsGatePct}% data
              completeness or when category, price, or size is unknown.
            </span>
            <span data-bi-ar="">
              يُقيَّم كل مرشّح من 0 إلى 100 عبر 12 معيارًا بالأوزان أدناه. تستخدم النتيجة المعايير القابلة للتقييم فقط،
              وتُخفى («تحتاج مراجعة») تحت {wpsGatePct}% من اكتمال البيانات أو عند جهل الفئة أو السعر أو الحجم.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <span data-bi-en="">Criterion</span>
                  <span data-bi-ar="">المعيار</span>
                </TableHead>
                <TableHead className="text-end">
                  <span data-bi-en="">Weight</span>
                  <span data-bi-ar="">الوزن</span>
                </TableHead>
                <TableHead className="text-end">
                  <span data-bi-en="">Source</span>
                  <span data-bi-ar="">المصدر</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WINNING_SCORE_CONFIG.criteria.map((c) => {
                const m = WPS_TYPE_META[WPS_KIND[c.key]];
                return (
                  <TableRow key={c.key}>
                    <TableCell className="font-medium">
                      <span data-bi-en="">{c.labelEn}</span>
                      <span data-bi-ar="">{c.labelAr}</span>
                    </TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">{c.weight}</TableCell>
                    <TableCell className="text-end">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
                      >
                        <span data-bi-en="">{m.en}</span>
                        <span data-bi-ar="">{m.ar}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Alert className="border-confidence-low/30">
            <Info className="size-4 text-confidence-low" />
            <AlertTitle>
              <span data-bi-en="">Honesty controls</span>
              <span data-bi-ar="">ضوابط الأمانة</span>
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc space-y-1 ps-4 text-xs">
                <li>
                  <span data-bi-en="">Verified facts vs estimates are labeled per criterion; the overall score inherits the lowest confidence tier present — it is never shown as more certain than its weakest input.</span>
                  <span data-bi-ar="">تُوسم الحقائق المؤكدة مقابل التقديرات لكل معيار؛ وترث النتيجة أدنى درجة ثقة موجودة — فلا تظهر أكثر يقينًا من أضعف مدخلاتها.</span>
                </li>
                <li>
                  <span data-bi-en="">Missing data lowers “completeness” by its weight — it is never scored as zero, and a sparse listing is held back for manual review rather than guessed.</span>
                  <span data-bi-ar="">تخفض البيانات الناقصة «الاكتمال» بمقدار وزنها — ولا تُحتسب صفرًا، وتُحجز القوائم الناقصة للمراجعة اليدوية بدل التخمين.</span>
                </li>
                <li>
                  <span data-bi-en="">Estimated criteria (break &amp; return risk, use-case, bundle) and the assisted sourcing check can be confirmed or overridden per product; an override is marked “Confirmed by you”.</span>
                  <span data-bi-ar="">يمكن تأكيد أو تعديل المعايير التقديرية (خطر الكسر والإرجاع، الاستخدام، التجميع) وفحص التوريد المُساعَد لكل منتج؛ ويوسَم التعديل بـ«مؤكَّد منك».</span>
                </li>
                <li>
                  <span data-bi-en="">Demand is a within-niche ordinal signal, not units sold; sourcing has no Amazon signal at all and relies on your AliExpress/1688 check.</span>
                  <span data-bi-ar="">الطلب إشارة ترتيبية داخل الفئة وليس وحدات مباعة؛ ولا تتوفر إشارة توريد من أمازون إطلاقًا، ويعتمد على فحصك على AliExpress/1688.</span>
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ───────────────────────── Data source ───────────────────────── */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-foreground">
              <Database className="size-4.5" />
            </span>
            <CardTitle className="text-base">
              <span data-bi-en="">Data source</span>
              <span data-bi-ar="">مصدر البيانات</span>
            </CardTitle>
          </div>
          <CardDescription>
            <span data-bi-en="">Where the numbers come from, and the rules collection runs under.</span>
            <span data-bi-ar="">من أين تأتي الأرقام، والقواعد التي يعمل بها الجمع.</span>
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
                <span data-bi-en="">Free / best-effort scraping</span>
                <span data-bi-ar="">جمع مجاني / بأفضل جهد</span>
              </span>
              <p className="max-w-xl text-sm text-muted-foreground">
                <span data-bi-en="">
                  Public amazon.eg pages are read on a best-effort basis. There is no paid
                  data feed behind these numbers — accuracy and freshness depend on what the
                  site serves to a logged-out visitor.
                </span>
                <span data-bi-ar="">
                  تُقرأ صفحات amazon.eg العامة بأفضل جهد. لا يوجد تغذية بيانات مدفوعة وراء هذه الأرقام —
                  الدقة والحداثة تعتمد على ما يقدمه الموقع للزائر غير المسجل.
                </span>
              </p>
            </div>
          </div>

          <Separator />

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">
                <span data-bi-en="">Marketplace</span>
                <span data-bi-ar="">السوق</span>
              </dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Globe className="size-3.5 text-muted-foreground/70" />
                {MARKETPLACE.domain}
              </dd>
            </div>
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">
                <span data-bi-en="">Marketplace ID</span>
                <span data-bi-ar="">معرّف السوق</span>
              </dt>
              <dd className="font-mono text-sm tabular-nums text-foreground">
                {MARKETPLACE.marketplaceId}
              </dd>
            </div>
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">
                <span data-bi-en="">Currency</span>
                <span data-bi-ar="">العملة</span>
              </dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {MARKETPLACE.currency}
              </dd>
            </div>
            <div className="space-y-1 rounded-xl bg-muted/50 p-3">
              <dt className="text-xs font-medium text-muted-foreground">
                <span data-bi-en="">Scrape cadence</span>
                <span data-bi-ar="">وتيرة الجمع</span>
              </dt>
              <dd className="text-sm font-medium text-foreground">
                <span data-bi-en="">Roughly daily, throttled</span>
                <span data-bi-ar="">يومياً تقريباً، مع تقييد</span>
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            <span data-bi-en="">
              Best-seller and movers lists are sampled about once a day at a deliberately
              slow rate; individual products refresh when you open them. Snapshots build the
              rank and price history over time — there is no real-time feed.
            </span>
            <span data-bi-ar="">
              تُؤخذ عينات من قوائم الأكثر مبيعاً والصاعدة مرة واحدة يومياً تقريباً بمعدل بطيء متعمد؛
              المنتجات الفردية تتجدد عند فتحها. تبني اللقطات تاريخ الترتيب والسعر بمرور الوقت — لا يوجد تغذية آنية.
            </span>
          </p>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              <span data-bi-en="">Legal &amp; ethical guardrails</span>
              <span data-bi-ar="">الضوابط القانونية والأخلاقية</span>
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {GUARDRAILS.map(({ icon: Icon, labelEn, labelAr, detailEn, detailAr }) => (
                <li
                  key={labelEn}
                  className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3 shadow-card"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">
                      <span data-bi-en="">{labelEn}</span>
                      <span data-bi-ar="">{labelAr}</span>
                    </span>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span data-bi-en="">{detailEn}</span>
                      <span data-bi-ar="">{detailAr}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Alert>
            <Info />
            <AlertTitle>
              <span data-bi-en="">Reliability is best-effort</span>
              <span data-bi-ar="">الموثوقية بأفضل جهد</span>
            </AlertTitle>
            <AlertDescription>
              <p>
                <span data-bi-en="">
                  On a free, logged-out scrape, amazon.eg may rate-limit, block, or serve
                  partial pages, so coverage and freshness can vary. For a more reliable feed,
                  a residential-proxy upgrade (about{" "}
                  <span className="font-medium text-foreground tabular-nums">$5/mo</span>) is
                  available to reduce blocking and stabilise collection. It changes resilience
                  only — never the honest-data labelling.
                </span>
                <span data-bi-ar="">
                  في عملية الجمع المجانية بدون تسجيل دخول، قد تفرض amazon.eg قيوداً على المعدل أو تحجب أو تقدم
                  صفحات جزئية، لذا قد تتفاوت التغطية والحداثة. لتغذية أكثر موثوقية، يتوفر ترقية البروكسي
                  السكني (نحو <span className="font-medium text-foreground tabular-nums">$5/شهر</span>)
                  لتقليل الحجب وتثبيت الجمع. يغير المرونة فقط — ليس التسمية الصادقة للبيانات.
                </span>
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
              <CardTitle className="text-base">
                <span data-bi-en="">Fee schedule</span>
                <span data-bi-ar="">جدول الرسوم</span>
              </CardTitle>
              <ConfidenceBadge
                confidence="medium"
                note="Researched defaults — spot-confirm before relying on the numbers."
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              <span data-bi-en="">As of </span>
              <span data-bi-ar="">اعتباراً من </span>
              {formatDate(schedule.asOf)}
            </span>
          </div>
          <CardDescription>
            <span data-bi-en="">The rates that drive the profit calculator. Editable in a configured deployment; shown read-only here.</span>
            <span data-bi-ar="">المعدلات التي تشغّل حاسبة الربح. قابلة للتعديل في النشر المُكوَّن؛ تُعرض للقراءة فقط هنا.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-5">
          <Alert>
            <Info />
            <AlertTitle>
              <span data-bi-en="">These fees are estimates</span>
              <span data-bi-ar="">هذه الرسوم تقديرية</span>
            </AlertTitle>
            <AlertDescription>{DISCLOSURE.estimatedFeesEn}</AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee-vat" className="text-xs text-muted-foreground">
                <span data-bi-en="">VAT rate</span>
                <span data-bi-ar="">نسبة ضريبة القيمة المضافة</span>
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
                <span data-bi-en="">FBA price band</span>
                <span data-bi-ar="">نطاق سعر FBA</span>
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
                <span data-bi-en="">Storage / cu ft / month</span>
                <span data-bi-ar="">التخزين / قدم مكعب / شهر</span>
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
            <h3 className="text-sm font-medium text-foreground">
              <span data-bi-en="">Referral fees by category</span>
              <span data-bi-ar="">رسوم الإحالة حسب الفئة</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              <span data-bi-en="">Charged on the sale price. Tiered categories apply each rate to the portion of the price within its band.</span>
              <span data-bi-ar="">تُحتسب على سعر البيع. الفئات ذات الطبقات تطبق كل معدل على الجزء المقابل من السعر ضمن نطاقه.</span>
            </p>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="ps-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span data-bi-en="">Category</span>
                      <span data-bi-ar="">الفئة</span>
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span data-bi-en="">Referral rate</span>
                      <span data-bi-ar="">نسبة الإحالة</span>
                    </TableHead>
                    <TableHead className="pe-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span data-bi-en="">Min fee</span>
                      <span data-bi-ar="">الحد الأدنى</span>
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
            <h3 className="text-sm font-medium text-foreground">
              <span data-bi-en="">FBA fulfilment ladder</span>
              <span data-bi-ar="">جدول رسوم FBA</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              <span data-bi-en="">
                Per-unit fulfilment fee by size tier. The low fee applies at or below the{" "}
                {formatEgp(schedule.fbaPriceBandEgp, "en", { decimals: 0 })} price band; the
                high fee applies above it.
              </span>
              <span data-bi-ar="">
                رسوم التلبية لكل وحدة حسب فئة الحجم. الرسوم المنخفضة تنطبق عند أو دون نطاق{" "}
                {formatEgp(schedule.fbaPriceBandEgp, "en", { decimals: 0 })} ؛ والرسوم المرتفعة تنطبق فوقه.
              </span>
            </p>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="ps-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span data-bi-en="">Size tier</span>
                      <span data-bi-ar="">فئة الحجم</span>
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span data-bi-en="">Max weight</span>
                      <span data-bi-ar="">الحد الأقصى للوزن</span>
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span data-bi-en="">Fee ≤ band</span>
                      <span data-bi-ar="">رسوم ≤ النطاق</span>
                    </TableHead>
                    <TableHead className="pe-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span data-bi-en="">Fee &gt; band</span>
                      <span data-bi-ar="">رسوم &gt; النطاق</span>
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
            <span data-bi-en="">Source: {schedule.provenance.source}. {schedule.provenance.note}</span>
            <span data-bi-ar="">المصدر: {schedule.provenance.source}. {schedule.provenance.note}</span>
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
            <CardTitle className="text-base">
              <span data-bi-en="">Language</span>
              <span data-bi-ar="">اللغة</span>
            </CardTitle>
          </div>
          <CardDescription>
            <span data-bi-en="">English and Arabic, with right-to-left support.</span>
            <span data-bi-ar="">الإنجليزية والعربية، مع دعم الاتجاه من اليمين إلى اليسار.</span>
          </CardDescription>
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
                <span data-bi-en="">Default interface language, laid out left-to-right.</span>
                <span data-bi-ar="">لغة الواجهة الافتراضية، مرتبة من اليسار إلى اليمين.</span>
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
                <span data-bi-en="">Full Arabic interface with right-to-left (RTL) layout and Cairo font.</span>
                <span data-bi-ar="">واجهة عربية كاملة بتخطيط من اليمين إلى اليسار وخط Cairo.</span>
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            <span data-bi-en="">
              Arabic product titles and search terms are always shown in their original script
              alongside the English data. To switch the interface language, use the language
              toggle in the top bar — the choice applies across every screen.
            </span>
            <span data-bi-ar="">
              تُعرض عناوين المنتجات العربية ومصطلحات البحث دائماً بخطها الأصلي مع البيانات الإنجليزية.
              لتبديل لغة الواجهة، استخدم زر تبديل اللغة في الشريط العلوي — يُطبَّق الاختيار على كل الشاشات.
            </span>
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
            <CardTitle className="text-base">
              <span data-bi-en="">About Rasid</span>
              <span data-bi-ar="">حول رصيد</span>
            </CardTitle>
          </div>
          <CardDescription>
            <span data-bi-en="">Honest product research for amazon.eg.</span>
            <span data-bi-ar="">أبحاث منتجات صادقة لـ amazon.eg.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm leading-relaxed text-foreground/90">
            <span data-bi-en="">
              Rasid is an institutional-grade product-research and arbitrage workbench for
              Amazon Egypt. It ranks what is selling and rising, tracks rank and price over
              time, estimates relative demand, and runs the fee-and-VAT math that decides
              whether a margin survives — all from free, public signals.
            </span>
            <span data-bi-ar="">
              رصيد هي منصة بحث منتجات ومراجحة من الدرجة المؤسسية لـ Amazon Egypt. تُرتب ما يُباع ويرتفع،
              وتتتبع الترتيب والسعر بمرور الوقت، وتُقدر الطلب النسبي، وتحسب رياضيات الرسوم وضريبة القيمة
              المضافة التي تُقرر هل ينجو الهامش — كل ذلك من إشارات عامة ومجانية.
            </span>
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span data-bi-en="">
              Its guiding principle is honesty about uncertainty: ranks and demand are framed
              as relative indicators, never as exact units sold or search volume, and every
              modeled value is labelled with its confidence tier. The fee engine is the one
              pillar built on deterministic math rather than estimation.
            </span>
            <span data-bi-ar="">
              مبدؤها التوجيهي هو الصدق حول عدم اليقين: تُقدَّم الترتيبات والطلب كمؤشرات نسبية،
              لا كوحدات مباعة أو حجم بحث دقيق، وكل قيمة نمذجة تُوسَم بمستوى ثقتها.
              محرك الرسوم هو الركيزة الوحيدة المبنية على رياضيات حتمية لا تقدير.
            </span>
          </p>
          <Separator />
          <div className="flex items-start gap-2.5">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">
              <span data-bi-en="">
                The methodology, marketplace facts, fee research, and audit findings behind this
                build live in{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  /docs/research
                </code>
                .
              </span>
              <span data-bi-ar="">
                المنهجية ووقائع السوق وأبحاث الرسوم ونتائج التدقيق وراء هذا البناء موجودة في{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  /docs/research
                </code>
                .
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
