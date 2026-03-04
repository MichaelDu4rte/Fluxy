import SensitiveMoney from "@/components/finance/SensitiveMoney";
import type { ExpenseAccount, ExpenseItem } from "@/components/expenses/types";
import { AlertTriangle, CircleCheck, Wallet } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

type ExpenseSummaryCardsProps = {
  expenses: ExpenseItem[];
  accounts: ExpenseAccount[];
  selectedCardId: "all" | string;
};

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export default function ExpenseSummaryCards({
  expenses,
  accounts,
  selectedCardId,
}: ExpenseSummaryCardsProps) {
  const expenseItems = expenses.filter((item) => item.kind === "expense");
  const incomeItems = expenses.filter((item) => item.kind === "income");

  const totalOutflow = expenseItems.reduce((acc, item) => acc + item.amount, 0);
  const totalInflow = incomeItems.reduce((acc, item) => acc + item.amount, 0);

  const pendingOpen = expenses
    .filter((item) => item.status !== "pago")
    .reduce((acc, item) => acc + item.amount, 0);

  const accountsInScope =
    selectedCardId === "all"
      ? accounts
      : accounts.filter((account) => account.id === selectedCardId);

  const availableTotal = accountsInScope.reduce(
    (acc, account) => acc + account.availableCents,
    0,
  ) / 100;

  const selectedCardName =
    selectedCardId === "all"
      ? null
      : accounts.find((account) => account.id === selectedCardId)?.name ?? null;

  const cards = [
    {
      id: "outflow",
      title: "Saídas",
      value: formatCurrency(totalOutflow),
      caption: `${expenseItems.length} lançamentos de despesa`,
      icon: Wallet,
      toneClass: "text-[#171611]",
    },
    {
      id: "inflow",
      title: "Entradas",
      value: formatCurrency(totalInflow),
      caption: `${incomeItems.length} lançamentos de receita`,
      icon: CircleCheck,
      toneClass: "text-emerald-700",
    },
    {
      id: "available",
      title: "Saldo disponível",
      value: `${availableTotal >= 0 ? "+" : "-"}${formatCurrency(Math.abs(availableTotal))}`,
      caption:
        selectedCardId === "all"
          ? "Soma do disponível em todas as contas"
          : `Disponível em ${selectedCardName ?? "conta selecionada"}`,
      icon: Wallet,
      toneClass: availableTotal >= 0 ? "text-emerald-700" : "text-rose-700",
    },
    {
      id: "open",
      title: "Pendentes/Atrasadas",
      value: formatCurrency(pendingOpen),
      caption: "Volume aberto no período",
      icon: AlertTriangle,
      toneClass: "text-[#171611]",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.id}
            className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.08),0px_2px_6px_-2px_rgba(0,0,0,0.04)] backdrop-blur-[6px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#877e64]">{card.title}</p>
                <p className={`mt-1 text-2xl font-bold tracking-[-0.03em] ${card.toneClass}`}>
                  <SensitiveMoney>{card.value}</SensitiveMoney>
                </p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3efe4] text-[#8d7116]">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs text-[#9a917b]">{card.caption}</p>
          </article>
        );
      })}
    </section>
  );
}
