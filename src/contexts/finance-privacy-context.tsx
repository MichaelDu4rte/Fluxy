"use client";

import { readCookieJson, writeCookieJson } from "@/src/lib/client-cookies";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const FINANCE_PRIVACY_COOKIE = "fluxy_sensitive_values_v1";

type FinancePrivacyCookieValue = {
  hidden?: unknown;
};

type FinancePrivacyContextValue = {
  isSensitiveHidden: boolean;
  toggleSensitiveVisibility: () => void;
  setSensitiveHidden: (hidden: boolean) => void;
};

const FinancePrivacyContext = createContext<FinancePrivacyContextValue | null>(null);

function readInitialSensitiveHiddenValue() {
  if (typeof document === "undefined") {
    return false;
  }

  const saved = readCookieJson<FinancePrivacyCookieValue>(FINANCE_PRIVACY_COOKIE);
  return typeof saved?.hidden === "boolean" ? saved.hidden : false;
}

export function FinancePrivacyProvider({ children }: { children: ReactNode }) {
  const [isSensitiveHidden, setIsSensitiveHidden] = useState(readInitialSensitiveHiddenValue);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    writeCookieJson(FINANCE_PRIVACY_COOKIE, {
      hidden: isSensitiveHidden,
    });
  }, [isSensitiveHidden]);

  const setSensitiveHidden = useCallback((hidden: boolean) => {
    setIsSensitiveHidden(Boolean(hidden));
  }, []);

  const toggleSensitiveVisibility = useCallback(() => {
    setIsSensitiveHidden((previous) => !previous);
  }, []);

  const value = useMemo<FinancePrivacyContextValue>(
    () => ({
      isSensitiveHidden,
      toggleSensitiveVisibility,
      setSensitiveHidden,
    }),
    [isSensitiveHidden, setSensitiveHidden, toggleSensitiveVisibility],
  );

  return (
    <FinancePrivacyContext.Provider value={value}>
      {children}
    </FinancePrivacyContext.Provider>
  );
}

export function useFinancePrivacy() {
  const context = useContext(FinancePrivacyContext);
  if (!context) {
    throw new Error("useFinancePrivacy must be used within FinancePrivacyProvider.");
  }
  return context;
}
