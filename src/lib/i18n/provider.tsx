"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { translations } from "./translations";

export type Lang = "ko" | "en";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  locale: string;
}

const LangContext = createContext<LangContextType>({
  lang: "ko",
  setLang: () => {},
  t: (key: string) => key,
  locale: "ko-KR",
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");
  const [hydrated, setHydrated] = useState(false);

  // Read localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved && (saved === "ko" || saved === "en")) {
      setLangState(saved);
    }
    setHydrated(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("lang", lang);
      document.documentElement.lang = lang;
    }
  }, [lang, hydrated]);

  const t = useCallback(
    (key: string) => translations[lang][key] ?? key,
    [lang]
  );

  const locale = lang === "ko" ? "ko-KR" : "en-US";

  return (
    <LangContext.Provider value={{ lang, setLang, t, locale }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
