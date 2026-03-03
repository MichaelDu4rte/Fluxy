import type { ExpenseDayGroup, ExpenseItem } from "@/components/expenses/types";
import ExpenseRow from "@/components/expenses/sections/ExpenseRow";

type ExpenseGroupedListProps = {
  expenses: ExpenseItem[];
  onExpenseClick?: (expense: ExpenseItem) => void;
};

const groupLabels: Record<ExpenseDayGroup, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "esta-semana": "Esta semana",
  anteriores: "Anteriores",
};

const groupOrder: ExpenseDayGroup[] = [
  "hoje",
  "ontem",
  "esta-semana",
  "anteriores",
];

export default function ExpenseGroupedList({
  expenses,
  onExpenseClick,
}: ExpenseGroupedListProps) {
  if (expenses.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-[#ddd8cc] bg-white/70 p-8 text-center">
        <h3 className="text-lg font-semibold text-[#171611]">Nenhuma transação encontrada</h3>
        <p className="mt-1 text-sm text-[#877e64]">
          Ajuste os filtros ou adicione um novo lançamento.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {groupOrder.map((groupKey) => {
        const rows = expenses.filter((expense) => expense.dayGroup === groupKey);

        if (rows.length === 0) {
          return null;
        }

        return (
          <div
            key={groupKey}
            className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.08),0px_2px_6px_-2px_rgba(0,0,0,0.04)] backdrop-blur-[6px]"
          >
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f6855]">
                {groupLabels[groupKey]}
              </h3>
              <span className="h-px flex-1 bg-[#e8e3d9]" />
            </div>

            <div className="space-y-2.5">
              {rows.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} onClick={onExpenseClick} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
