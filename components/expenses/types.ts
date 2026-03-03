export type ExpenseStatus = "pago" | "pendente" | "atrasado";
export type ExpenseType = "unica" | "recorrente";
export type TransactionKind = "expense" | "income";
export type FinancialAccountType = "credit" | "debit" | "investment";

export type ExpenseAccountId = string;

export type ExpenseCategory =
  | "moradia"
  | "alimentacao"
  | "transporte"
  | "assinaturas"
  | "lazer"
  | "saude"
  | "educacao"
  | "outros";

export type ExpenseViewMode = "todas" | "despesas" | "receitas";
export type ExpenseEditScope = "item" | "series";

export type ExpenseDayGroup =
  | "hoje"
  | "ontem"
  | "esta-semana"
  | "anteriores";

export type ExpenseItem = {
  id: string;
  seriesId: string | null;
  kind: TransactionKind;
  merchant: string;
  description: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  type: ExpenseType;
  accountId: ExpenseAccountId;
  accountName: string;
  amount: number;
  dateISO: string;
  dateLabel: string;
  dayGroup: ExpenseDayGroup;
  isInstallment: boolean;
  installmentIndex: number;
  installmentTotal: number;
  isRecurring: boolean;
};

export type ExpenseAccount = {
  id: string;
  name: string;
  type: FinancialAccountType;
  last4Digits: string | null;
  creditLimitCents: number | null;
  initialBalanceCents: number;
  isActive: boolean;
  availableCents: number;
  incomeTotalCents: number;
  expenseTotalCents: number;
  creditUsedCents: number;
  utilizationPct: number;
};

export type ExpenseFilterState = {
  search: string;
  dateFrom: string;
  dateTo: string;
  category: "todas" | ExpenseCategory;
  card: "all" | ExpenseAccountId;
  status: "todos" | ExpenseStatus;
  type: "todos" | ExpenseType;
  mode: ExpenseViewMode;
};

export type NewExpenseInput = {
  kind: TransactionKind;
  merchant: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
  type: ExpenseType;
  accountId: ExpenseAccountId;
  dateISO: string;
  isInstallment: boolean;
  installmentTotal: number;
  isRecurring: boolean;
};

export type UpdateExpenseInput = {
  targetId: string;
  scope: ExpenseEditScope;
  merchant: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
  accountId: ExpenseAccountId;
  dateISO: string;
};

export type DeleteExpenseInput = {
  targetId: string;
  scope: ExpenseEditScope;
};
