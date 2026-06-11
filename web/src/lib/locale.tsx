"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "ar";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // localStorage is unreadable during SSR — hydrate-in-effect is the canonical
  // pattern (the pre-paint inline script in the root layout avoids the flash).
  useEffect(() => {
    const saved = (localStorage.getItem("rasid.locale") as Locale) ?? "en";
    applyLocale(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
    setLocaleState(saved);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("rasid.locale", next);
    applyLocale(next);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}
