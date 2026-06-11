"use client";

/**
 * Per-candidate override store for the Winning Product Score.
 *
 * The hybrid model: the engine auto-infers the soft criteria with low confidence;
 * the user can OVERRIDE a subscore or CONFIRM the auto value, which visibly raises
 * that criterion to "user-confirmed". Overrides live in localStorage (the same
 * `rasid.*` namespace as locale.tsx) — no backend needed. The pure reducer is
 * split out and exported so it can be unit-tested without a DOM.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CriterionKey, CriterionOverride, WpsOverrides } from "@/lib/types";

const STORAGE_KEY = "rasid.wps.overrides";

/* ───────────── pure reducer (exported for tests — no React, no storage) ────── */

export function setOverride(
  state: WpsOverrides,
  asin: string,
  key: CriterionKey,
  ov: CriterionOverride,
): WpsOverrides {
  return { ...state, [asin]: { ...(state[asin] ?? {}), [key]: ov } };
}

export function clearOverride(state: WpsOverrides, asin: string, key: CriterionKey): WpsOverrides {
  const forAsin = state[asin];
  if (!forAsin || !(key in forAsin)) return state; // no-op → same reference
  const { [key]: _removed, ...rest } = forAsin;
  if (Object.keys(rest).length === 0) {
    const { [asin]: _drop, ...others } = state;
    return others;
  }
  return { ...state, [asin]: rest };
}

export function getProductOverrides(
  state: WpsOverrides,
  asin: string,
): Partial<Record<CriterionKey, CriterionOverride>> {
  return state[asin] ?? {};
}

/* ───────────────────────── React store (localStorage) ─────────────────────── */

interface WpsOverrideContextValue {
  overrides: WpsOverrides;
  setOverride: (asin: string, key: CriterionKey, ov: CriterionOverride) => void;
  confirm: (asin: string, key: CriterionKey, note?: string) => void;
  clearOverride: (asin: string, key: CriterionKey) => void;
  clearProduct: (asin: string) => void;
}

const WpsOverrideContext = createContext<WpsOverrideContextValue>({
  overrides: {},
  setOverride: () => {},
  confirm: () => {},
  clearOverride: () => {},
  clearProduct: () => {},
});

export function WpsOverrideProvider({ children }: { children: ReactNode }) {
  const [overrides, setState] = useState<WpsOverrides>({});

  // Load once on mount (client only), guarding a malformed blob. localStorage
  // is unreadable during SSR, so hydrate-in-effect is the canonical pattern.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
      if (raw) setState(JSON.parse(raw) as WpsOverrides);
    } catch {
      /* corrupt → start empty */
    }
  }, []);

  function persist(next: WpsOverrides) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable → keep in memory */
    }
  }

  const value: WpsOverrideContextValue = {
    overrides,
    setOverride: (asin, key, ov) =>
      persist(setOverride(overrides, asin, key, { ...ov, updatedAt: ov.updatedAt || new Date().toISOString() })),
    confirm: (asin, key, note) =>
      persist(setOverride(overrides, asin, key, { confirm: true, note, updatedAt: new Date().toISOString() })),
    clearOverride: (asin, key) => persist(clearOverride(overrides, asin, key)),
    clearProduct: (asin) => {
      const { [asin]: _drop, ...rest } = overrides;
      persist(rest);
    },
  };

  return <WpsOverrideContext.Provider value={value}>{children}</WpsOverrideContext.Provider>;
}

export function useWpsOverrides() {
  return useContext(WpsOverrideContext);
}
