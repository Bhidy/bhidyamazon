# Rasid — Screen Build Contract (read fully before writing code)

You are building ONE screen of **Rasid**, an institutional-grade Amazon Egypt
(amazon.eg) product-research & arbitrage platform. The foundation is already
built and verified. Match it exactly. Quality bar: production, institutional.

## 0. FIRST — learn the patterns from real code
Before writing, **Read these files** to copy the exact conventions:
- `src/app/(app)/page.tsx` — the dashboard (the reference screen)
- `src/components/app/rank-row.tsx`, `page-header.tsx`, `kpi-card.tsx`, `confidence.tsx`, `badges.tsx`
- `src/lib/data.ts`, `src/lib/types.ts`, `src/lib/fees.ts` — exact function & type signatures
- The specific `src/components/ui/*.tsx` for any shadcn primitive you use (to confirm its Base UI API)

## 1. Stack & hard gotchas (this is NOT the stack you remember)
- **Next.js 16** App Router. Pages are **async Server Components**. `searchParams` and `params` are **Promises** — `const sp = await searchParams`. Add `"use client"` only to interactive sub-components.
- **shadcn/ui is built on Base UI (`@base-ui/react`), NOT Radix.** There is **no `asChild`**. To render a component as another element use the **`render` prop**: `render={<Link href="..." />}`.
  - For a button that navigates, use **`<ButtonLink href="...">`** (`src/components/app/button-link.tsx`) — never `<Button asChild>`.
  - For a Tooltip trigger that is not a button, use `<TooltipTrigger render={<span .../>}>`.
  - `Select`, `Tabs`, `Switch`, `Slider`, `Dialog`, `Checkbox` etc. are Base UI — **Read the `ui/*.tsx` file first** to confirm prop names (e.g. value/onValueChange may differ). Do not assume Radix APIs.
- Tailwind v4. A `TooltipProvider` is already global (in root layout) — just use `Tooltip`/`TooltipTrigger`/`TooltipContent`.
- Tabular numbers: add `tabular-nums` to any cell showing numbers/prices/ranks.

## 2. File rules (STRICT — prevents collisions with other agents)
- Write ONLY inside your own route folder: `src/app/(app)/<your-route>/page.tsx`
  and, if you need interactive/client sub-components, `src/app/(app)/<your-route>/_components/<name>.tsx` (the `_components` folder is private, not a route).
- Dynamic route: `src/app/(app)/products/[asin]/page.tsx` with `params: Promise<{ asin: string }>`.
- **Do NOT** modify `globals.css`, `layout.tsx`, the `(app)/layout.tsx`, `src/lib/*`, `src/components/app/*`, `src/components/ui/*`, or any other route. **Do NOT** add new shared components or install packages. If you need a small helper, put it in your route's `_components`.
- Default-export the page component.

## 3. Available API (use these EXACT signatures — do not invent)
### `@/lib/data`
- `getBestSellers({ categoryNode?, period?, limit? }): RankingRow[]`
- `getMovers({ categoryNode?, period?, limit? }): RankingRow[]`
- `getProduct(asin, period?): Product | undefined`
- `getBsrHistory(asin): BsrHistory` → `{ asin, points: SeriesPoint[], pricePoints: SeriesPoint[], provenance }` where `SeriesPoint = { date: string; value: number | null }`
- `getReviews(asin, { limit? }): Review[]`
- `getSentimentSummary(asin): SentimentSummary`
- `getKeywords({ limit?, lang? }): Keyword[]`
- `searchProducts(query, period?): Product[]`
- `getWatchlist(): WatchlistItem[]`
- `getAlerts(): Alert[]`
- `getDashboardSummary(period?): DashboardSummary`
### `@/lib/fees`
- `computeProfit(input: CalculatorInput, schedule?): CalculatorResult`
- `DEFAULT_FEE_SCHEDULE: FeeSchedule`, `getReferralRule(categoryNode, schedule?)`, `computeReferralFee(price, rule)`, `computeFbaFee(price, sizeTier, schedule)`
### `@/lib/constants`
- `CATEGORIES: Category[]` (`{ nodeId, slug, nameEn, nameAr }`), `CATEGORY_BY_NODE`, `MARKETPLACE`, `DEMAND_BAND_META`, `DISCLOSURE`, `CONFIDENCE_META`
### `@/lib/format`
- `formatEgp(v, locale?, {decimals?,compact?})`, `formatNumber`, `formatPct(v,locale?,{fromRatio?,signed?})`, `formatRank`, `formatDate`, `formatRating`
### `@/lib/types` — `Product, RankingRow, Review, SentimentSummary, Keyword, BsrHistory, Period ('daily'|'weekly'|'monthly'), DemandBand, CalculatorInput, CalculatorResult, FeeSchedule, WatchlistItem, Alert`, etc.
### `@/components/app/*`
- `PageHeader({ title, description?, children? })` — children render as right-aligned actions
- `KpiCard({ label, value, icon?, hint?, footer? })`
- `CalibrationNotice()` — render on any screen showing ranks/demand
- `RankRow({ row, showSpark? })` — dense ranking row, links to `/products/[asin]`
- `Freshness({ iso, label? })`, `PeriodTabs({ value, params? })`
- `ConfidenceBadge({ confidence, note? })`, `ProvenanceHint({ provenance })`
- `DemandBadge({ band })`, `TrendIndicator({ value, suffix?, invert? })`
- `RatingStars({ rating, count?, size?, showValue? })`, `ProductThumb({ product, size? })`
- `Spark({ data: (number|null)[], invert? })` — pass BSR points with `invert`
- `ButtonLink({ href, ...buttonProps })`
### `@/components/ui/*` (installed): button, card, table, badge, input, label, select, textarea, tabs, dialog, sheet, dropdown-menu, tooltip, separator, skeleton, sonner, avatar, scroll-area, breadcrumb, command, popover, switch, slider, chart, sidebar, form, alert, progress, accordion, checkbox, pagination, alert-dialog, hover-card, collapsible. (Card exports `Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter`. Table exports `Table, TableHeader, TableBody, TableRow, TableHead, TableCell`.)
### Charts
- Use `recharts` directly (it is installed) or the shadcn `chart` wrapper. For sparkline-in-row, use the existing `Spark`. For larger charts add `"use client"`.

## 4. The honest-data rules (Critical — these are correctness controls)
- **NEVER** display an exact "units sold" or "search volume" number. Use ranks, rank-velocity, demand bands, and the 0–100 relative demand score.
- Label every modeled value: wrap estimates with `ConfidenceBadge confidence="low"` and use the `DISCLOSURE` copy (`DISCLOSURE.demandProxyEn`, `.estimatedFeesEn`, `.ordinalEn`).
- Render `<CalibrationNotice />` near the top of screens that show ranks/demand.
- For reviews/sentiment, show "based on N of M reviews" using `SentimentSummary.analysedCount` / `.totalReported`.
- Fees are estimates: on the calculator show `ConfidenceBadge confidence="medium"` + `DISCLOSURE.estimatedFeesEn`.

## 5. Design rules (match the dashboard)
- Page starts with `<PageHeader title=… description=…>` (actions like `PeriodTabs` as children).
- Use `Card` with `CardHeader` (often `border-b pb-4`) + `CardContent`. Lists use `CardContent className="p-2"` with `RankRow`s.
- Muted, institutional, restrained. Tabular numbers. Good empty states. Responsive (stack on mobile, `sm:`/`lg:` grids).
- Bilingual: where data has `titleAr` / Arabic queries, show it as secondary text with `dir="rtl"` and `className="font-arabic"`.
- Accessibility: real headings, `aria-label`s on icon-only controls.

## 6. Done = your `page.tsx` (and any `_components`) compiles against these signatures, follows the patterns, and renders the full screen with real data from `@/lib/data`. Return the list of files you created.
