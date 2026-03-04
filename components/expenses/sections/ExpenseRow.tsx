import SensitiveMoney from "@/components/finance/SensitiveMoney";
import {
  expenseCategoryLabels,
  getExpenseStatusLabel,
} from "@/components/expenses/expense-mock-data";
import type { ExpenseCategory, ExpenseItem } from "@/components/expenses/types";
import { cn } from "@/lib/utils";
import {
  CarTaxiFront,
  CircleHelp,
  CreditCard,
  GraduationCap,
  HeartPulse,
  House,
  Popcorn,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import type { ComponentType } from "react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const categoryIconMap: Record<ExpenseCategory, ComponentType<{ className?: string }>> = {
  moradia: House,
  alimentacao: ShoppingCart,
  transporte: CarTaxiFront,
  assinaturas: ReceiptText,
  lazer: Popcorn,
  saude: HeartPulse,
  educacao: GraduationCap,
  outros: CircleHelp,
};

type ExpenseRowProps = {
  expense: ExpenseItem;
  onClick?: (expense: ExpenseItem) => void;
};

function getStatusClass(status: ExpenseItem["status"]) {
  if (status === "pago") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "pendente") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

function getAmountLabel(expense: ExpenseItem) {
  const prefix = expense.kind === "income" ? "+" : "-";
  return `${prefix}${currencyFormatter.format(expense.amount)}`;
}

export default function ExpenseRow({ expense, onClick }: ExpenseRowProps) {
  const CategoryIcon = categoryIconMap[expense.category];
  const isInteractive = Boolean(onClick);

  function handleActivate() {
    if (!onClick) {
      return;
    }

    onClick(expense);
  }

  return (
    <article
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ece8de] bg-[#fffcf7] px-3 py-3 sm:px-4",
        isInteractive
          ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-[#ddd5c4] hover:shadow-[0px_10px_24px_-14px_rgba(23,22,17,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/55"
          : undefined,
      )}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `Editar lançamento ${expense.merchant}` : undefined}
      onClick={isInteractive ? handleActivate : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleActivate();
            }
          }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3efe4] text-[#8d7116]">
          <CategoryIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#171611] sm:text-base">
            {expense.merchant}
          </p>
          <p className="truncate text-xs text-[#877e64] sm:text-sm">
            {expense.description}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-[#f3efe4] px-2 py-0.5 font-medium text-[#6f6855]">
              {expenseCategoryLabels[expense.category]}
            </span>

            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                expense.kind === "income"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-[#f1f2f5] text-[#616370]",
              )}
            >
              {expense.kind === "income" ? "Receita" : "Despesa"}
            </span>

            {expense.isRecurring ? (
              <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 font-medium text-[#5f6066]">
                Recorrente
              </span>
            ) : null}

            {expense.isInstallment ? (
              <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 font-medium text-[#4f5f99]">
                Parcela {expense.installmentIndex}/{expense.installmentTotal}
              </span>
            ) : null}

            <span className="text-[#9b927d]">•</span>
            <span className="inline-flex items-center gap-1.5 text-[#6f6855]">
              <span className="inline-flex h-4 w-5 items-center justify-center rounded-[4px] bg-[#171611] text-white">
                <CreditCard className="h-2.5 w-2.5" />
              </span>
              {expense.accountName}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-auto text-right">
        <p
          className={cn(
            "text-sm font-bold sm:text-base",
            expense.kind === "income" ? "text-emerald-700" : "text-[#171611]",
          )}
        >
          <SensitiveMoney>{getAmountLabel(expense)}</SensitiveMoney>
        </p>
        <p className="mt-0.5 text-xs text-[#877e64]">{expense.dateLabel}</p>
        <span
          className={cn(
            "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
            getStatusClass(expense.status),
          )}
        >
          {getExpenseStatusLabel(expense.status, expense.kind)}
        </span>
      </div>
    </article>
  );
}
