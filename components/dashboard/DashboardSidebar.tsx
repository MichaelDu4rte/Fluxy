"use client";

import LogoutButton from "@/app/(app)/dashboard/LogoutButton";
import type { NavItem } from "@/components/dashboard/types";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Lock,
  Plus,
  Settings,
  Wallet,
  Waypoints,
} from "lucide-react";
import Link from "next/link";

type DashboardSidebarProps = {
  userName: string;
  userEmail: string;
  items: NavItem[];
  className?: string;
  onNavigate?: () => void;
};

const iconMap = {
  dashboard: LayoutDashboard,
  wallet: Wallet,
  planner: Waypoints,
  vault: Lock,
  settings: Settings,
};

export default function DashboardSidebar({
  userName,
  userEmail,
  items,
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
      <div className="space-y-8 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#b38c19]/20 bg-[#efe8d6] text-lg font-semibold text-[#b38c19] shadow-sm">
            {userInitial}
          </div>

          <div>
            <p className="text-lg font-semibold leading-[1.2] text-[#171611]">{userName}</p>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#877e64]">
              {userEmail}
            </p>
          </div>
        </div>

        <nav className="space-y-2" aria-label="Navegação lateral">
          {items.map((item) => {
            const Icon = iconMap[item.id];

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors",
                  item.isActive
                    ? "bg-[#e5e1d8]/65 text-[#b38c19]"
                    : "text-[#171611] hover:bg-[#ebe8de]/70",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 p-6 pt-4">
        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b38c19] text-sm font-bold text-white shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#9e7c16]"
        >
          <Plus className="h-4 w-4" />
          Nova transação
        </button>

        <LogoutButton
          label="Sair da conta"
          variant="secondary"
          className="h-12 rounded-2xl border border-[#e7e3da] bg-white text-[#171611] hover:bg-[#f2efe7]"
        />
      </div>
    </aside>
  );
}
