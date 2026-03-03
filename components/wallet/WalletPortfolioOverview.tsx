"use client";

import type { WalletPortfolioSummaryVm } from "@/components/wallet/types";
import { cn } from "@/lib/utils";

type WalletPortfolioOverviewProps = {
  summary: WalletPortfolioSummaryVm;
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function WalletPortfolioOverview({
  summary,
}: WalletPortfolioOverviewProps) {
  const changePositive = summary.monthChangePct >= 0;

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-[#252525] bg-[linear-gradient(120deg,#131313_0%,#191919_48%,#111111_100%)] p-5 text-white shadow-[0px_20px_60px_-24px_rgba(0,0,0,0.55)] sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-8 top-8 h-[2px] w-[120%] rotate-[6deg] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#b38c19]/15 blur-3xl" />
      </div>

      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#bcae8a]">
            Visão geral do portfólio
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <h2 className="text-3xl font-light tracking-[-0.03em] sm:text-4xl">
              {summary.totalPortfolioLabel}
            </h2>
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-lg px-2 text-xs font-semibold",
                changePositive
                  ? "bg-emerald-600/20 text-emerald-300"
                  : "bg-rose-600/20 text-rose-300",
              )}
            >
              {summary.monthChangeLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">
              Eficiência do portfólio
            </p>
            <p className="mt-1 text-2xl font-light text-[#dbc37a]">
              {formatPercent(summary.efficiencyPct)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Índice de liquidez</p>
            <p className="mt-1 text-2xl font-light">{formatPercent(summary.liquidityPct)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
