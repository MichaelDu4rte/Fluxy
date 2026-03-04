"use client";

import { dashboardNavItems } from "@/components/dashboard/dashboard-mock-data";
import type { NavItemId } from "@/components/dashboard/types";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import {
  FinancePrivacyProvider,
  useFinancePrivacy,
} from "@/src/contexts/finance-privacy-context";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type DashboardLayoutProps = {
  userName: string;
  userEmail: string;
  activeNavId: NavItemId;
  children: ReactNode;
};

export default function DashboardLayout({
  userName,
  userEmail,
  activeNavId,
  children,
}: DashboardLayoutProps) {
  return (
    <FinancePrivacyProvider>
      <DashboardLayoutShell
        userName={userName}
        userEmail={userEmail}
        activeNavId={activeNavId}
      >
        {children}
      </DashboardLayoutShell>
    </FinancePrivacyProvider>
  );
}

function DashboardLayoutShell({
  userName,
  userEmail,
  activeNavId,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { isSensitiveHidden, toggleSensitiveVisibility } = useFinancePrivacy();
  const privacyToggleLabel = isSensitiveHidden
    ? "Mostrar valores sensíveis"
    : "Ocultar valores sensíveis";

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-[100dvh] bg-[#f8f7f3] text-[#171611]">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#e5e1d8] bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#ece7dc] text-[#171611]"
          aria-label="Abrir navegação"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#877e64]">
          Fluxy
        </div>

        <button
          type="button"
          onClick={toggleSensitiveVisibility}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#ece7dc] text-[#171611]"
          aria-label={privacyToggleLabel}
          title={privacyToggleLabel}
          aria-pressed={isSensitiveHidden}
        >
          {isSensitiveHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[304px] md:block">
        <DashboardSidebar
          userName={userName}
          userEmail={userEmail}
          activeNavId={activeNavId}
          items={dashboardNavItems}
          className="h-full"
        />
      </aside>

      <AnimatePresence>
        {sidebarOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              onClick={() => setSidebarOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
            />

            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[304px] md:hidden"
              initial={{ x: prefersReducedMotion ? 0 : -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: prefersReducedMotion ? 0 : -28, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.14 : 0.24 }}
            >
              <div className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7e3da] bg-white text-[#171611]"
                  aria-label="Fechar navegação"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <DashboardSidebar
                userName={userName}
                userEmail={userEmail}
                activeNavId={activeNavId}
                items={dashboardNavItems}
                onNavigate={() => setSidebarOpen(false)}
                className="h-full"
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="min-w-0 md:ml-[304px]">{children}</div>
    </div>
  );
}
