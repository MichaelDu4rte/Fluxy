"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SensitiveMoney from "@/components/finance/SensitiveMoney";
import type { WalletPerformanceRowVm, WalletSortMode } from "@/components/wallet/types";
import { ArrowUpDown, Loader2, Pencil, Trash2 } from "lucide-react";

type WalletPerformanceTableProps = {
  rows: WalletPerformanceRowVm[];
  sortMode: WalletSortMode;
  onSortModeChange: (mode: WalletSortMode) => void;
  deletingId: string | null;
  onEdit: (accountId: string) => void;
  onDelete: (accountId: string) => void;
};

const sortLabels: Record<WalletSortMode, string> = {
  "allocation-desc": "Alocação",
  "aum-desc": "AUM",
  "return-desc": "Retorno",
  "name-asc": "Nome",
};

export default function WalletPerformanceTable({
  rows,
  sortMode,
  onSortModeChange,
  deletingId,
  onEdit,
  onDelete,
}: WalletPerformanceTableProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[#171611]">
            Seus cartões
          </h3>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#eadfca] bg-[#f8f3e6] px-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#b38c19]"
              aria-label="Ordenar ativos da carteira"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Ordenar ativos
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuRadioGroup
              value={sortMode}
              onValueChange={(value) => onSortModeChange(value as WalletSortMode)}
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#ece7dd] bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left">
            <thead className="bg-[#faf8f3]">
              <tr className="text-[11px] uppercase tracking-[0.12em] text-[#8f8771]">
                <th className="px-4 py-3 font-semibold">Instrumento</th>
                <th className="px-4 py-3 font-semibold">Saldo disponível</th>
                <th className="px-4 py-3 font-semibold">Já gasto</th>
                <th className="px-4 py-3 font-semibold">Limite mensal</th>
                <th className="px-4 py-3 font-semibold">Utilização de crédito</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#7f7763]">
                    Nenhum ativo encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : null}

              {rows.map((row) => (
                <tr key={row.accountId} className="border-t border-[#f0ebe1] text-sm text-[#2b261d]">
                  <td className="px-4 py-4">
                    <div className="font-medium text-[#171611]">{row.accountName}</div>
                    <div className="text-xs text-[#8a816c]">
                      {row.typeLabel}
                      {row.last4DigitsLabel ? ` • ${row.last4DigitsLabel}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-[#171611]">
                      <SensitiveMoney>{row.availableBalanceLabel}</SensitiveMoney>
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-[#3d3628]">
                      <SensitiveMoney>{row.spentLabel}</SensitiveMoney>
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium">
                    <SensitiveMoney>{row.monthlyLimitLabel}</SensitiveMoney>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-[#ebe7dc]">
                        <div
                          className="h-full rounded-full bg-[#b38c19]"
                          style={{
                            width: `${Math.max(0, Math.min(100, row.utilizationPct))}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#4f4736]">
                        {row.utilizationLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(row.accountId)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#e8e2d6] bg-[#f7f4ec] px-3 text-xs font-medium text-[#5f5745] transition hover:bg-[#eee7d7]"
                        aria-label={`Editar ${row.accountName}`}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row.accountId)}
                        disabled={deletingId === row.accountId}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Deletar ${row.accountName}`}
                      >
                        {deletingId === row.accountId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
