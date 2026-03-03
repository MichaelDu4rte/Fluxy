import type { ExpenseViewMode } from "@/components/expenses/types";
import { cn } from "@/lib/utils";

type ExpensesHeaderProps = {
  mode: ExpenseViewMode;
  onModeChange: (mode: ExpenseViewMode) => void;
};

export default function ExpensesHeader({
  mode,
  onModeChange,
}: ExpensesHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#171611] sm:text-4xl">
          Despesas e fluxo de caixa
        </h1>
        <p className="mt-1 text-sm text-[#877e64] sm:text-base">
          Monitore gastos, recorrências e alertas em um único painel.
        </p>
      </div>

      <div className="inline-flex items-center rounded-xl border border-[#e8e3d9] bg-white p-1 shadow-sm">
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "todas"
              ? "bg-[#f3efe4] text-[#171611]"
              : "text-[#6f6855] hover:bg-[#f8f5ed]",
          )}
          onClick={() => onModeChange("todas")}
          aria-label="Mostrar todas as transações"
          aria-pressed={mode === "todas"}
        >
          Todos
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "despesas"
              ? "bg-[#f3efe4] text-[#171611]"
              : "text-[#6f6855] hover:bg-[#f8f5ed]",
          )}
          onClick={() => onModeChange("despesas")}
          aria-label="Mostrar apenas despesas"
          aria-pressed={mode === "despesas"}
        >
          Despesas
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "receitas"
              ? "bg-[#f3efe4] text-[#171611]"
              : "text-[#6f6855] hover:bg-[#f8f5ed]",
          )}
          onClick={() => onModeChange("receitas")}
          aria-label="Mostrar apenas receitas"
          aria-pressed={mode === "receitas"}
        >
          Receitas
        </button>
      </div>
    </header>
  );
}
