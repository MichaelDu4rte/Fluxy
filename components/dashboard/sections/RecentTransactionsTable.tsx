import SensitiveMoney from "@/components/finance/SensitiveMoney";
import type { Transaction } from "@/components/dashboard/types";
import { Plane, ShoppingBag, UtensilsCrossed } from "lucide-react";

type RecentTransactionsTableProps = {
  transactions: Transaction[];
};

const iconMap = {
  plane: Plane,
  utensils: UtensilsCrossed,
  shopping: ShoppingBag,
};

export default function RecentTransactionsTable({
  transactions,
}: RecentTransactionsTableProps) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] backdrop-blur-[6px]">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#171611]">Transações recentes</h3>
        <button
          type="button"
          className="text-sm font-medium text-[#b38c19] transition-opacity hover:opacity-80"
        >
          Ver todas
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="border-b border-[#f3f4f6] px-1 pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-[#877e64]">
                Transação
              </th>
              <th className="border-b border-[#f3f4f6] px-1 pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-[#877e64]">
                Categoria
              </th>
              <th className="border-b border-[#f3f4f6] px-1 pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-[#877e64]">
                Data
              </th>
              <th className="border-b border-[#f3f4f6] px-1 pb-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-[#877e64]">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-sm text-[#877e64]"
                >
                  Nenhuma transação encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : null}

            {transactions.map((transaction) => {
              const Icon = iconMap[transaction.icon];

              return (
                <tr key={transaction.id}>
                  <td className="py-4 pr-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#171611]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-[#171611]">{transaction.merchant}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-6 text-sm text-[#877e64]">{transaction.category}</td>
                  <td className="py-4 pr-6 text-sm text-[#877e64]">{transaction.date}</td>
                  <td className="py-4 text-right text-sm font-medium text-[#171611]">
                    <SensitiveMoney>{transaction.amount}</SensitiveMoney>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
