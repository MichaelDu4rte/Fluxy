"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Wallet } from "lucide-react";

type StatusFilter = "active" | "inactive" | "all";

type WalletHeaderBarProps = {
  searchValue: string;
  totalPortfolioLabel: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onOpenCreate: () => void;
};

export default function WalletHeaderBar({
  searchValue,
  totalPortfolioLabel,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onOpenCreate,
}: WalletHeaderBarProps) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-[#e9e4da] bg-white/85 p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="w-full max-w-[560px]">
        <label htmlFor="wallet-search" className="sr-only">
          Buscar instrumentos
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b937d]" />
          <Input
            id="wallet-search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar instrumentos da carteira..."
            className="h-11 rounded-2xl border-[#ece6db] bg-[#f8f6f1] pl-10 text-sm text-[#423d31] placeholder:text-[#a29a85]"
            aria-label="Buscar instrumentos da carteira"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
        <div className="inline-flex rounded-2xl border border-[#e8e2d6] bg-[#f8f6f1] p-1">
          {[
            { value: "active" as const, label: "Ativos" },
            { value: "inactive" as const, label: "Inativos" },
            { value: "all" as const, label: "Todos" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
              className={`h-8 rounded-xl px-3 text-xs font-semibold transition ${statusFilter === option.value
                ? "bg-white text-[#9f7b17] shadow-sm"
                : "text-[#7d7665] hover:text-[#5b5444]"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>


      </div>
    </section>
  );
}
