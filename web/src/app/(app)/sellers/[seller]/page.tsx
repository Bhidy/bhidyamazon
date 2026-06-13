import Link from "next/link";
import { notFound } from "next/navigation";
import { Store, Star, Package, Layers, ShieldCheck, TriangleAlert, Swords } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { KpiCard } from "@/components/app/kpi-card";
import { ProductThumb } from "@/components/app/product-thumb";
import { RatingStars } from "@/components/app/rating-stars";
import { ConfidenceBadge } from "@/components/app/confidence";
import { getSeller } from "@/lib/data";
import { CATEGORY_BY_NODE } from "@/lib/constants";
import { formatEgp, formatNumber, formatRank, formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ seller: string }>;
}) {
  const { seller: slug } = await params;
  const seller = getSeller(slug);
  if (!seller) notFound();

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              <span data-bi-en="">Dashboard</span>
              <span data-bi-ar="">لوحة التحكم</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/sellers" />}>
              <span data-bi-en="">Sellers</span>
              <span data-bi-ar="">البائعون</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{seller.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <Card className="shadow-card-lg">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-brand-foreground">
            <Store className="size-7" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {seller.name}
              </h1>
              <ConfidenceBadge
                confidence="high"
                note="Seller = brand/store byline on tracked amazon.eg listings; a sample of their items, not their full catalogue."
              />
            </div>
            <p className="text-sm text-muted-foreground">
              <span data-bi-en="">
                {formatNumber(seller.productCount)} tracked product{seller.productCount === 1 ? "" : "s"} ·{" "}
                {formatNumber(seller.categories.length)} categor{seller.categories.length === 1 ? "y" : "ies"} on amazon.eg
              </span>
              <span data-bi-ar="">
                {formatNumber(seller.productCount)} منتج متابَع · {formatNumber(seller.categories.length)} فئة على amazon.eg
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={<><span data-bi-en="">Avg rating</span><span data-bi-ar="">متوسط التقييم</span></>}
          value={seller.avgRating != null ? formatRating(seller.avgRating) : "—"}
          icon={Star}
        />
        <KpiCard
          label={<><span data-bi-en="">Total reviews</span><span data-bi-ar="">إجمالي المراجعات</span></>}
          value={formatNumber(seller.totalReviews)}
          icon={Star}
        />
        <KpiCard
          label={<><span data-bi-en="">Best BSR</span><span data-bi-ar="">أفضل ترتيب</span></>}
          value={formatRank(seller.bestBsr)}
          icon={Package}
        />
        <KpiCard
          label={<><span data-bi-en="">Price range</span><span data-bi-ar="">نطاق السعر</span></>}
          value={
            seller.minPriceEgp != null
              ? `${formatEgp(seller.minPriceEgp)} – ${formatEgp(seller.maxPriceEgp)}`
              : "—"
          }
          icon={Layers}
        />
      </div>

      {/* Competitive intelligence */}
      <div className="grid gap-3 lg:grid-cols-3">
        <AnalysisCard
          titleEn="Their strengths"
          titleAr="نقاط قوتهم"
          icon={<ShieldCheck className="size-4 text-positive" />}
          items={seller.strengths}
          accent="border-l-positive/50"
        />
        <AnalysisCard
          titleEn="Their weaknesses"
          titleAr="نقاط ضعفهم"
          icon={<TriangleAlert className="size-4 text-negative" />}
          items={seller.weaknesses}
          accent="border-l-negative/50"
        />
        <AnalysisCard
          titleEn="How to beat them"
          titleAr="كيف تتفوق عليهم"
          icon={<Swords className="size-4 text-brand" />}
          items={seller.plays}
          accent="border-l-brand/50"
        />
      </div>

      {/* Their products */}
      <Card className="gap-0">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4 text-brand" />
            <span data-bi-en="">Their products we track</span>
            <span data-bi-ar="">منتجاتهم التي نتابعها</span>
          </CardTitle>
          <CardDescription>
            <span data-bi-en="">Sampled from amazon.eg best-seller listings — not their full catalogue.</span>
            <span data-bi-ar="">عينة من قوائم الأكثر مبيعاً على amazon.eg — وليست كامل كتالوجهم.</span>
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {seller.products.map((p) => (
            <Link
              key={p.asin}
              href={`/products/${p.asin}`}
              className={cn(
                "card-hover group flex gap-3 rounded-xl border border-border/70 bg-card p-3",
                "hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <ProductThumb product={p} size={56} />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground group-hover:underline">
                  {p.titleEn}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {CATEGORY_BY_NODE[p.categoryNode]?.nameEn ?? p.categoryNode}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold tabular-nums text-primary">{formatEgp(p.priceEgp)}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">BSR {formatRank(p.bsr)}</span>
                </div>
                <div className="mt-1">
                  <RatingStars rating={p.rating} count={p.reviewCount} size={11} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

function AnalysisCard({
  titleEn,
  titleAr,
  icon,
  items,
  accent,
}: {
  titleEn: string;
  titleAr: string;
  icon: React.ReactNode;
  items: string[];
  accent: string;
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          <span data-bi-en="">{titleEn}</span>
          <span data-bi-ar="">{titleAr}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className={cn("rounded-md border-l-2 bg-muted/40 px-3 py-2 text-xs text-foreground", accent)}>
              {it}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
