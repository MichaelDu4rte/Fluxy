"use client";

import type { WalletPortfolioSummaryVm } from "@/components/wallet/types";
import { cn } from "@/lib/utils";
import { Info, TrendingDown, TrendingUp } from "lucide-react";

type WalletPortfolioOverviewProps = {
  summary: WalletPortfolioSummaryVm;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function WalletPortfolioOverview({
  summary,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: WalletPortfolioOverviewProps) {
  const changePositive = summary.monthChangePct >= 0;

  function KpiLabelWithTooltip({
    label,
    description,
  }: {
    label: string;
    description: string;
  }) {
    const tooltipId = `kpi-tooltip-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className="group relative inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-white/60">
        <span>{label}</span>
        <Info
          className="h-3.5 w-3.5 text-white/70 transition group-hover:text-white"
          tabIndex={0}
          aria-describedby={tooltipId}
        />
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-10 mt-1 max-w-[220px] rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-[11px] leading-snug text-white opacity-0 shadow-lg transition duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:max-w-[260px]"
        >
          {description}
        </div>
      </div>
    );
  }

  return (
    <section className="relative min-h-[240px] overflow-hidden rounded-[28px] border border-[#2c2c2c] bg-[radial-gradient(circle_at_20%_20%,rgba(179,140,25,0.10),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_32%),linear-gradient(125deg,#0f0f0f_0%,#141414_48%,#0d0d0d_100%)] p-6 text-white shadow-[0px_28px_80px_-40px_rgba(0,0,0,0.65)] sm:p-7 lg:min-h-[260px] lg:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[24px_24px] opacity-40" />
        <div className="absolute -left-24 top-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -right-10 -top-6 h-56 w-56 rounded-full bg-[#b38c19]/22 blur-3xl" />
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c8bb98]">
              Visão geral do portfólio
            </p>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
              <label className="sr-only" htmlFor="wallet-date-from">
                Data inicial
              </label>
              <input
                id="wallet-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => onDateFromChange(event.target.value)}
                className="h-7 rounded-md border border-white/10 bg-black/20 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white outline-none transition focus:border-white/30"
              />
              <span className="text-white/60">–</span>
              <label className="sr-only" htmlFor="wallet-date-to">
                Data final
              </label>
              <input
                id="wallet-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => onDateToChange(event.target.value)}
                className="h-7 rounded-md border border-white/10 bg-black/20 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white outline-none transition focus:border-white/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <h2 className="text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
              {summary.totalPortfolioLabel}
            </h2>
            <span
              className={cn(
                "inline-flex h-7 items-center gap-2 rounded-xl px-3 text-sm font-semibold",
                changePositive
                  ? "bg-emerald-600/25 text-emerald-200"
                  : "bg-rose-600/25 text-rose-200",
              )}
            >
              {changePositive ? (
                <TrendingUp className="h-4 w-4" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4" aria-hidden />
              )}
              {summary.monthChangeLabel}
            </span>
          </div>

          <p className="text-sm font-medium text-white/70">
            Gasto atual:{" "}
            <span className="font-semibold text-rose-200">{summary.currentSpentLabel}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <KpiLabelWithTooltip
              label="Eficiência do portfólio"
              description="(Capacidade total - valor utilizado) dividido pela capacidade total no período."
            />
            <p className="mt-2 text-2xl font-semibold text-[#d9c27a]">
              {formatPercent(summary.efficiencyPct)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <KpiLabelWithTooltip
              label="Índice de liquidez"
              description="Patrimônio total dividido pelas saídas liquidadas no intervalo selecionado."
            />
            <p className="mt-2 text-2xl font-semibold text-[#d9c27a]">
              {formatPercent(summary.liquidityPct)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <KpiLabelWithTooltip
              label="Variação mensal"
              description="Δ (entradas - saídas) do período atual vs. período anterior de mesma duração."
            />
            <p
              className={cn(
                "mt-2 text-2xl font-semibold",
                changePositive ? "text-emerald-200" : "text-rose-200",
              )}
            >
              {summary.monthChangeLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
