"use client";

import LogoutButton from "@/app/(app)/dashboard/LogoutButton";
import type { NavItem, NavItemId } from "@/components/dashboard/types";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, LayoutDashboard, Lock, Settings, Wallet, Waypoints } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import type { ComponentType } from "react";

type DashboardSidebarProps = {
  userName: string;
  userEmail: string;
  items: NavItem[];
  activeNavId: NavItemId;
  className?: string;
  onNavigate?: () => void;
};

const iconMap: Record<NavItemId, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  expenses: ArrowLeftRight,
  wallet: Wallet,
  planner: Waypoints,
  vault: Lock,
  settings: Settings,
};

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export default function DashboardSidebar({
  userName,
  userEmail,
  items,
  activeNavId,
  className,
  onNavigate,
}: DashboardSidebarProps) {
  const userInitial = userName.trim().charAt(0).toUpperCase() || "A";

  return (
    <aside
      className={cn(
        "flex h-full w-[304px] flex-col justify-between overflow-y-auto border-r border-[#e5e1d8] bg-[#f8f7f6]",
        className,
      )}
    >
      <div className="space-y-6 p-6">
        <div className="mt-1 space-y-2 border-b border-[#ebe6da] pb-4">
          <div className="flex items-center justify-between rounded-2xl border border-[#e7e3da] bg-[#f1ede4]/70 px-4 py-3 shadow-[0_4px_14px_-10px_rgba(0,0,0,0.25)]">
            <span
              className={cn(
                playfair.className,
                "text-xl font-semibold tracking-tight text-[#7a6120]",
              )}
            >
              Fluxy
            </span>
          </div>
        </div>

        <nav className="space-y-2" aria-label="Navegação lateral">
          {items.map((item) => {
            const Icon = iconMap[item.id];
            const isActive = item.id === activeNavId;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors",
                  isActive
                    ? "bg-[#ede3d2]/90 text-[#8a6c22]"
                    : "text-[#171611] hover:bg-[#f2ece0]",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#efeae0] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#b38c19]/20 bg-[#efe8d6] text-sm font-semibold text-[#7a6120] shadow-sm">
              {userInitial}
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold text-[#171611]">{userName}</span>
            </div>
          </div>
          <LogoutButton
            label="Sair da conta"
            variant="ghost"
            iconOnly
            className="h-10 w-10 justify-center rounded-full text-[#7a6120] hover:bg-[#f2ece0] hover:text-[#171611]"
          />
        </div>
      </div>
    </aside>
  );
}
