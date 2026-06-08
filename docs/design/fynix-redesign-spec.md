# Fynix Redesign — Authoritative Design Spec (Rasid → ultra-premium fintech)

**Mandate:** transform the *visual language* of the Rasid app to match the attached **Fynix AI-Finance** dashboard reference. **DESIGN ONLY — never change features, data, routes, props, fetching, copy semantics, or honest-data labels.** Only `className`/markup-structure/token/style changes. Preserve RTL/Arabic, a11y (skip-link, headings, focus rings, reduced-motion), and WCAG AA contrast.

This file is the single source of truth. Every agent reads it. Use the EXACT tokens below — never hard-code hexes in components (except inside gradient recipes given here).

---

## 1. Brand palette (the reference)
| Role | HEX | Usage |
|---|---|---|
| **Lime** | `#9FE870` | THE signature accent: gradient hero, primary CTAs (dark text on lime), positive/rising fills, chart "light" series, demand bars, active highlights, progress fills |
| **Forest** | `#062F28` | dark buttons (white text), dark chart "income" series, headings/text, dark surfaces, logo tile |
| **Gray** | `#7B7B7B` | secondary text, icons, muted UI |
| **White** | `#FFFFFF` | cards, sidebar, surfaces |
| Canvas | `#EFF1F2` | app background (light cool gray) behind white cards |

**Look:** white cards floating on a light-gray canvas, **large radii** (cards ~24px, pills/buttons fully rounded), **soft layered shadows** (not borders/rings), one **lime gradient hero** per dashboard, **two-tone green** charts (forest + lime), generous spacing, geometric sans, restrained motion.

## 2. Token map — rewrite `globals.css` `:root` to these (oklch)
```
--background: oklch(0.97 0.004 220);      --foreground: oklch(0.24 0.03 174);
--card: oklch(1 0 0);                     --card-foreground: oklch(0.24 0.03 174);
--popover: oklch(1 0 0);                  --popover-foreground: oklch(0.24 0.03 174);
--primary: oklch(0.29 0.046 172);         /* forest #062F28 */
--primary-foreground: oklch(0.98 0.015 128);
--secondary: oklch(0.955 0.006 200);      --secondary-foreground: oklch(0.29 0.046 172);
--muted: oklch(0.96 0.005 200);           --muted-foreground: oklch(0.49 0.012 210); /* AA */
--accent: oklch(0.95 0.035 128);          /* pale lime hover */  --accent-foreground: oklch(0.29 0.046 172);
--destructive: oklch(0.55 0.21 25);
--border: oklch(0.922 0.005 210);         --input: oklch(0.922 0.005 210);
--ring: oklch(0.62 0.16 145);             /* green focus ring */
--brand: oklch(0.87 0.175 131);           /* lime #9FE870 */  --brand-foreground: oklch(0.29 0.046 172);
--chart-1: oklch(0.29 0.046 172);  --chart-2: oklch(0.87 0.175 131);  --chart-3: oklch(0.55 0.12 150);
--chart-4: oklch(0.78 0.10 140);   --chart-5: oklch(0.72 0.02 210);
--positive: oklch(0.52 0.15 155);  --positive-foreground: oklch(0.985 0 0);
--negative: oklch(0.52 0.21 25);   --negative-foreground: oklch(0.985 0 0);
--neutral-sig: oklch(0.5 0.02 210);  --rising: oklch(0.52 0.15 155);  --falling: oklch(0.52 0.21 25);
--confidence-high: oklch(0.5 0.13 158);  --confidence-medium: oklch(0.56 0.12 75);  --confidence-low: oklch(0.58 0.13 60);
--radius: 1rem;  /* was 0.625 */
--sidebar: oklch(1 0 0);  --sidebar-foreground: oklch(0.24 0.03 174);
--sidebar-primary: oklch(0.29 0.046 172);  --sidebar-primary-foreground: oklch(0.98 0.015 128);
--sidebar-accent: oklch(0.95 0.035 128);   /* pale lime active */  --sidebar-accent-foreground: oklch(0.29 0.046 172);
--sidebar-border: oklch(0.93 0.004 210);   --sidebar-ring: oklch(0.62 0.16 145);
```
Dark theme (`.dark`, secondary — keep functional): bg `oklch(0.19 0.022 174)`, card `oklch(0.23 0.025 174)`, foreground `oklch(0.96 0.01 130)`, primary→lime `oklch(0.87 0.175 131)` w/ forest fg, brand lime, border `oklch(1 0 0 / 9%)`, sidebar `oklch(0.21 0.024 174)`, charts same hues lightened.

## 3. Shadow + gradient tokens — add to `@theme inline` in globals.css
```
--shadow-card: 0 1px 2px rgba(6,47,40,0.05), 0 10px 30px -14px rgba(6,47,40,0.12);
--shadow-card-lg: 0 2px 6px rgba(6,47,40,0.05), 0 24px 60px -20px rgba(6,47,40,0.20);
--shadow-brand: 0 10px 28px -8px rgba(159,232,112,0.55);
```
→ enables `shadow-card`, `shadow-card-lg`, `shadow-brand`. **Cards use `shadow-card` + `ring-0/border` minimal, NOT the old `ring-1 ring-foreground/10`.**
Hero gradient (use inline on the hero card only):
`background: radial-gradient(130% 130% at 85% 5%, #B9F291 0%, #9FE870 42%, #80D652 100%);` + an absolutely-positioned blurred white/lime radial blob at ~70% for the "swirl".

## 4. Typography
- Font: **Plus Jakarta Sans** (self-hosted via `@fontsource-variable/plus-jakarta-sans` or `@fontsource/plus-jakarta-sans` 400–800). Set `--font-sans` AND `--font-heading` to it. Keep Geist Mono for `--font-mono`, Cairo for `--font-arabic`.
- Weights: headings/values **600–800**, body 400–500.
- Scale: hero figure `text-4xl md:text-5xl font-bold tracking-tight`; KPI value `text-2xl md:text-3xl font-bold tabular-nums`; card title `text-base font-semibold`; section page title `text-2xl font-bold tracking-tight`; body `text-sm`. Keep `tabular-nums` on all data.

## 5. Component recipes (shared primitives — built in the FOUNDATION pass)
- **Button** (`ui/button.tsx`): base radius → **`rounded-full`** (pill); default size taller `h-9 px-4`, `lg` `h-11 px-6 text-[0.95rem]`, `sm` `h-8 px-3`. Variants:
  - `default` = `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm` (forest pill, white text — "Send").
  - **NEW `brand`** = `bg-brand text-brand-foreground hover:brightness-105 shadow-brand` (lime pill, forest text — "Exchange/Upgrade/Deposit-primary").
  - `outline` = `border-border bg-card hover:bg-muted` (white pill, "Deposit").
  - `secondary`/`ghost`/`destructive`/`link` keep, just pill radius. Keep `data-icon` paddings.
- **Card** (`ui/card.tsx`): `rounded-[1.5rem]` (24px), `bg-card`, **`shadow-card`**, remove `ring-1 ring-foreground/10` → `border border-border/60` hairline + shadow; `--card-spacing: --spacing(5)`; keep slots. Hover (interactive cards add): `transition-shadow hover:shadow-card-lg`.
- **Badge** (`ui/badge.tsx`): already pill. Add tonal variants via className at call-site: brand pill = `bg-brand/15 text-brand-foreground`, positive = `bg-positive/12 text-positive`, etc. Add `brand` + `success` + `warning` variants to cva using the tokens.
- **KpiCard** (`app/kpi-card.tsx`): white card, top row = label + **icon in a rounded-xl tinted chip** (`bg-accent text-brand-foreground size-9`), value `text-3xl font-bold`, footer = delta in a small pill (`text-positive`/`text-falling`). `shadow-card`, rounded-2xl.
- **Sidebar** (`app/app-sidebar.tsx` + `ui/sidebar.tsx` tokens): white bg, hairline border. Logo tile → **lime** (`bg-brand text-brand-foreground`). Add a **profile block** under the logo (avatar + name + "Personal Account" + chevron) using existing app name (no new data — static "Rasid / amazon.eg radar" is fine; do NOT invent user data — keep the brand identity block). Active item = `bg-sidebar-accent text-sidebar-accent-foreground font-semibold rounded-xl` with a lime dot/indicator; idle = muted, hover `bg-muted`. Footer "Upgrade"-style card = keep the existing disclosure note but in a rounded-2xl tinted card (`bg-accent`), DO NOT add billing features.
- **TopBar** (`app/top-bar.tsx`): taller `h-16`, search → **pill** (`rounded-full bg-muted/60 h-10` with ⌘F hint chip), right cluster = Free-tier badge + locale toggle + (keep) — render settings/help lucide icons as ghost icon-buttons + a small avatar circle (decorative, brand gradient) to echo the reference. No new functionality.
- **Table** (`ui/table.tsx` + usages): generous row height, `text-sm`, header `text-xs uppercase tracking-wide text-muted-foreground`, row hover `bg-muted/40`, status → tonal pill badges, rounded container. Right-align numerics `tabular-nums`.
- **Charts** (`ui/chart.tsx`, `app/bsr-spark.tsx`, product history): use `--chart-1` (forest) + `--chart-2` (lime); bars `radius={[6,6,0,0]}` rounded tops; sparkline lime stroke w/ soft area gradient; donut/pie use chart-1..5 greens; grid `stroke var(--border)` subtle; tooltip = white rounded-xl shadow-card.

## 6. Per-screen directives (restyle pass — preserve ALL content/logic)
- **Dashboard `(app)/page.tsx`**: introduce a **lime gradient hero card** at top that surfaces EXISTING summary data (products tracked / freshness / top riser / categories) with forest text + Deposit-style ghost actions linking to existing routes (e.g. "Run a profit check" → /calculator, "View best sellers" → /bestsellers). Then KPI row (restyled KpiCards). Keep Rising / Best-sellers / Demand-radar cards — restyle to white rounded-2xl shadow-card, lime accents, restyled RankRows. Demand bars → `bg-brand`.
- **Best Sellers / Movers**: premium ranked cards/table, rank in a lime/forest numbered chip, demand band pills tonal, sparkline lime.
- **Demand Radar / Keywords**: prominence bars → `bg-brand` (lime), tier chips tonal (Top=brand, High/Medium=muted), keep honest labels verbatim.
- **Products / Product detail**: product hero card, price in forest bold, rating stars lime/amber, **rank&price history chart two-tone green**, review intelligence donut greens, review list cards rounded with tonal verified pills. Keep every honest provenance note.
- **Search / Watchlists / Alerts / Settings / Calculator**: apply card/button/badge/input recipes; calculator = premium form card + result panel with lime "profit" emphasis; keep all formulas/fields.
- **Empty/loading/not-found states**: restyle to match (rounded, muted, lime icon accents) — keep messages.

## 7. Hard constraints (every agent)
1. **No feature/data/logic/route/prop/text-semantics changes.** Only visual. If a change requires touching data flow, DON'T — restyle only.
2. Use tokens, not raw hexes (except §3 gradient recipes).
3. Keep WCAG AA: lime is a FILL/large-accent only — never small text on white (use forest/positive token for green text). Verify contrast.
4. Keep RTL (`dir`, `start/end` logical props, `ms/me/ps/pe`), Arabic font, focus rings, reduced-motion, semantic headings, `tabular-nums`.
5. Don't add component libraries; stay on shadcn/Base UI + tokens. Animation = restrained CSS/`tw-animate-css` (+ GSAP only if explicitly assigned).
6. Must keep `tsc` clean and the production build green.
