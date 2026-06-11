"use client";

/**
 * Alerts store — REAL client-side persistence + an honest, pure evaluation
 * engine, replacing the fabricated demo alerts that previously lived in data.ts.
 *
 * Persistence model: rules live in localStorage (`rasid.*` namespace, same
 * pattern as wps-overrides.tsx / watchlist-store.tsx). Each rule captures a
 * BASELINE snapshot of the product at creation time (price / BSR / rating /
 * stock), so evaluation compares two real observations.
 *
 * Evaluation model (honest by construction): rules are evaluated ON VIEW —
 * when the Alerts page renders — against the latest committed daily snapshot.
 * There is no background engine and no push notification, and the UI says so.
 * The evaluator is a pure exported function so it is unit-testable.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AlertRule } from "@/lib/types";

const STORAGE_KEY = "rasid.alerts.v1";

/** Product facts captured when the rule is created (the comparison baseline). */
export interface AlertBaseline {
  priceEgp?: number;
  bsr?: number;
  rating?: number;
  inStock?: boolean;
}

export interface StoredAlert {
  id: string;
  asin: string;
  titleEn: string;
  titleAr?: string;
  rule: AlertRule;
  threshold: Record<string, number | string>;
  active: boolean;
  createdAt: string; // ISO-8601
  baseline: AlertBaseline;
}

export type AlertsState = Record<string, StoredAlert>;

/* ───────────── pure reducers (exported for tests — no React, no storage) ───── */

export function addAlert(state: AlertsState, alert: StoredAlert): AlertsState {
  return { ...state, [alert.id]: alert };
}

export function removeAlert(state: AlertsState, id: string): AlertsState {
  if (!(id in state)) return state; // no-op → same reference
  const { [id]: _drop, ...rest } = state;
  return rest;
}

export function setAlertActive(state: AlertsState, id: string, active: boolean): AlertsState {
  const a = state[id];
  if (!a || a.active === active) return state;
  return { ...state, [id]: { ...a, active } };
}

/* ───────────────────────── pure evaluation engine ─────────────────────────── */

/** The product's facts at the LATEST snapshot (server-provided on page view). */
export interface AlertCurrent {
  priceEgp?: number;
  bsr?: number;
  rating?: number;
  inStock?: boolean;
}

/**
 * met      — the rule's condition holds at the latest snapshot.
 * not-met  — evaluated, condition does not hold.
 * no-data  — cannot evaluate: product is off the tracked lists, or the needed
 *            value is missing on either side. Shown as such, never as "not met".
 */
export type AlertEvalStatus = "met" | "not-met" | "no-data";

export function evaluateAlert(
  alert: StoredAlert,
  current: AlertCurrent | undefined,
  /** Whether the asin is on the rank-rising list for a window ("24h"|"7d"|"30d"). */
  isRising: (window: string) => boolean,
): AlertEvalStatus {
  if (!current) return "no-data";
  switch (alert.rule) {
    case "price_drop": {
      const pct = Number(alert.threshold.pct);
      if (!Number.isFinite(pct) || current.priceEgp == null || alert.baseline.priceEgp == null)
        return "no-data";
      return current.priceEgp <= alert.baseline.priceEgp * (1 - pct / 100) ? "met" : "not-met";
    }
    case "rating_drop": {
      const pct = Number(alert.threshold.pct);
      if (!Number.isFinite(pct) || current.rating == null || alert.baseline.rating == null)
        return "no-data";
      return current.rating <= alert.baseline.rating * (1 - pct / 100) ? "met" : "not-met";
    }
    case "bsr_rising": {
      const window = String(alert.threshold.window ?? "7d");
      return isRising(window) ? "met" : "not-met";
    }
    case "back_in_stock": {
      if (current.inStock == null) return "no-data";
      // Honest reading: fires only on an observed OOS→in-stock transition. If the
      // product was in stock at creation, there is nothing to come "back" from.
      if (alert.baseline.inStock !== false) return "not-met";
      return current.inStock ? "met" : "not-met";
    }
  }
}

/* ───────────────────────── React store (localStorage) ─────────────────────── */

interface AlertsContextValue {
  alerts: AlertsState;
  /** False during the first client render — render a skeleton, not "empty". */
  ready: boolean;
  add: (alert: StoredAlert) => void;
  remove: (id: string) => void;
  setActive: (id: string, active: boolean) => void;
}

const AlertsContext = createContext<AlertsContextValue>({
  alerts: {},
  ready: false,
  add: () => {},
  remove: () => {},
  setActive: () => {},
});

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertsState>({});
  const [ready, setReady] = useState(false);

  // localStorage is unreadable during SSR — hydrate-in-effect is the canonical
  // pattern; the single cascading render is intended (skeleton → data).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
      if (raw) setAlerts(JSON.parse(raw) as AlertsState);
    } catch {
      /* corrupt → start empty */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
    setReady(true);
  }, []);

  function persist(next: AlertsState) {
    setAlerts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable → keep in memory */
    }
  }

  const value: AlertsContextValue = {
    alerts,
    ready,
    add: (alert) => persist(addAlert(alerts, alert)),
    remove: (id) => persist(removeAlert(alerts, id)),
    setActive: (id, active) => persist(setAlertActive(alerts, id, active)),
  };

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  return useContext(AlertsContext);
}
