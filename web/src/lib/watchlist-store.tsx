"use client";

/**
 * Watchlist store — REAL client-side persistence (localStorage), replacing the
 * fabricated demo watchlist that previously lived in data.ts.
 *
 * Same architecture as wps-overrides.tsx: a pure, exported reducer (unit-testable
 * without a DOM) + a thin React provider that persists to the `rasid.*`
 * localStorage namespace. No backend needed; swapping to a Supabase RLS table
 * later changes only this file.
 *
 * Each entry stores a SNAPSHOT of the product at add-time (title, price, …) so a
 * watched product that later drops off the scraped best-seller lists still
 * renders — flagged as "off current lists" rather than silently disappearing.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "rasid.watchlist.v1";

/** Product snapshot captured when the user adds the item. */
export interface WatchlistEntry {
  addedAt: string; // ISO-8601
  titleEn: string;
  titleAr?: string;
  brand?: string;
  categoryNode?: string;
  categoryName?: string;
  priceEgp?: number;
  rating?: number;
  reviewCount?: number;
  bsr?: number;
  imageUrl?: string;
}

export type WatchlistState = Record<string, WatchlistEntry>;

/* ───────────── pure reducers (exported for tests — no React, no storage) ───── */

export function addEntry(state: WatchlistState, asin: string, entry: WatchlistEntry): WatchlistState {
  return { ...state, [asin]: entry };
}

export function removeEntry(state: WatchlistState, asin: string): WatchlistState {
  if (!(asin in state)) return state; // no-op → same reference
  const { [asin]: _drop, ...rest } = state;
  return rest;
}

/* ───────────────────────── React store (localStorage) ─────────────────────── */

interface WatchlistContextValue {
  /** asin → snapshot. Empty until `ready` (localStorage loads after mount). */
  items: WatchlistState;
  /** False during the first client render — render a skeleton, not "empty". */
  ready: boolean;
  add: (asin: string, entry: WatchlistEntry) => void;
  remove: (asin: string) => void;
  isWatched: (asin: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  items: {},
  ready: false,
  add: () => {},
  remove: () => {},
  isWatched: () => false,
});

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistState>({});
  const [ready, setReady] = useState(false);

  // Load once on mount (client only), guarding a malformed blob. localStorage
  // is unreadable during SSR, so hydrate-in-effect is the canonical pattern —
  // the single cascading render it costs is the point (skeleton → data).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
      if (raw) setItems(JSON.parse(raw) as WatchlistState);
    } catch {
      /* corrupt → start empty */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
    setReady(true);
  }, []);

  function persist(next: WatchlistState) {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable → keep in memory */
    }
  }

  const value: WatchlistContextValue = {
    items,
    ready,
    add: (asin, entry) => persist(addEntry(items, asin, entry)),
    remove: (asin) => persist(removeEntry(items, asin)),
    isWatched: (asin) => asin in items,
  };

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
