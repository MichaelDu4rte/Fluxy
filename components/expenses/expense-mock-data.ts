import type {
  ExpenseCategory,
  ExpenseFilterState,
  ExpenseStatus,
  ExpenseType,
  TransactionKind,
} from "@/components/expenses/types";

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  moradia: "Moradia",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  assinaturas: "Assinaturas",
  lazer: "Lazer",
  saude: "Saúde",
  educacao: "Educação",
  outros: "Outros",
};

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

export const expenseStatusFilterLabels: Record<ExpenseStatus, string> = {
  pago: "Pago/Recebido",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

export function getExpenseStatusLabel(status: ExpenseStatus, kind: TransactionKind) {
  if (status === "pago" && kind === "income") {
    return "Recebido";
  }

  return expenseStatusLabels[status];
}

export const expenseTypeLabels: Record<ExpenseType, string> = {
  unica: "Única",
  recorrente: "Recorrente",
};

export const expenseFilterDefaults: ExpenseFilterState = {
  search: "",
  dateFrom: "",
  dateTo: "",
  category: "todas",
  card: "all",
  status: "todos",
  type: "todos",
  mode: "todas",
};
