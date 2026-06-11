import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/plus-jakarta-sans"; // primary UI/display face (self-hosted)
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/lib/locale";
import { WatchlistProvider } from "@/lib/watchlist-store";
import { AlertsProvider } from "@/lib/alerts-store";

// Self-hosted fonts only — Geist via geist/font (next/font/local under the hood)
// and Cairo via @fontsource — so the production build never fetches Google Fonts.
// GeistSans/GeistMono .variable set --font-geist-sans / --font-geist-mono; Cairo's
// @font-face family is wired to --font-arabic on <html> below (see globals.css).

export const metadata: Metadata = {
  title: {
    default: "Rasid — Amazon Egypt Product Radar",
    template: "%s · Rasid",
  },
  description:
    "Find what's selling and trending on amazon.eg. Track best sellers, rising products, demand signals, reviews, and run the profit numbers before you source.",
  applicationName: "Rasid",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      style={{ ["--font-arabic" as string]: "'Cairo', sans-serif" }}
    >
      <body className="min-h-full">
        {/* Apply the saved locale BEFORE first paint (parser-blocking inline
            script). Without this an Arabic user gets an English/LTR flash on
            every load, because LocaleProvider only applies dir/lang in a
            post-hydration effect. Must stay in sync with lib/locale.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('rasid.locale')==='ar'){var d=document.documentElement;d.lang='ar';d.dir='rtl'}}catch(e){}",
          }}
        />
        <LocaleProvider>
          <WatchlistProvider>
            <AlertsProvider>
              <TooltipProvider delay={200}>{children}</TooltipProvider>
              <Toaster richColors position="top-right" />
            </AlertsProvider>
          </WatchlistProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
