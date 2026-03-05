"use client";

import ExpenseAddModal from "@/components/expenses/ExpenseAddModal";
import ExpenseEditModal from "@/components/expenses/ExpenseEditModal";
import {
  expenseCategoryLabels,
  expenseFilterDefaults,
  expenseStatusFilterLabels,
  expenseTypeLabels,
} from "@/components/expenses/expense-mock-data";
import type {
  DeleteExpenseInput,
  ExpenseAccount,
  ExpenseCategory,
  ExpenseDayGroup,
  ExpenseFilterState,
  ExpenseItem,
  ExpenseStatus,
  ExpenseType,
  ExpenseViewMode,
  NewExpenseInput,
  UpdateExpenseInput,
} from "@/components/expenses/types";
import ExpenseGroupedList from "@/components/expenses/sections/ExpenseGroupedList";
import ExpensesHeader from "@/components/expenses/sections/ExpensesHeader";
import ExpenseSummaryCards from "@/components/expenses/sections/ExpenseSummaryCards";
import { Skeleton } from "@/components/ui/skeleton";
import { readCookieJson, writeCookieJson } from "@/src/lib/client-cookies";
import {
  invalidateFinanceSnapshotQuery,
  useFinanceSnapshotQuery,
} from "@/src/lib/queries/finance";
import { useTelegramRealtimeRefresh } from "@/src/lib/realtime/useTelegramRealtimeRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const enterEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

type ApiFinancialAccountType = "credit" | "debit" | "investment";
type ApiTransactionStatus = "pago" | "pendente" | "atrasado";
type ApiTransactionKind = "expense" | "income";
type ApiTransactionFrequency = "unica" | "recorrente";
type ApiScope = "item" | "series";

const TRANSACTIONS_FILTERS_COOKIE = "fluxy_transacoes_filters_v1";

type ApiCardDto = {
  id: string;
  name: string;
  type: ApiFinancialAccountType;
  last4Digits: string | null;
  creditLimitCents: number | null;
  initialBalanceCents: number;
  isActive: boolean;
  metrics: {
    availableCents: number;
    incomeTotalCents: number;
    expenseTotalCents: number;
    creditUsedCents: number;
    utilizationPct: number;
  };
};

type ApiTransactionDto = {
  id: string;
  accountId: string;
  kind: ApiTransactionKind;
  status: ApiTransactionStatus;
  frequency: ApiTransactionFrequency;
  category: string;
  merchant: string;
  description: string;
  amountCents: number;
  occurredAt: string;
  seriesId: string | null;
  isInstallment: boolean;
  installmentIndex: number;
  installmentTotal: number;
  isRecurring: boolean;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const ExpensesToolbar = dynamic(
  () => import("@/components/expenses/sections/ExpensesToolbar"),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-2xl border border-[#e7e2d7] bg-white/90 p-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-11 min-w-[220px] flex-1 rounded-xl bg-[#f6f3ea]" />
          <div className="hidden h-6 w-px bg-[#ece7db] sm:block" />
          <div className="h-10 w-[170px] rounded-xl bg-[#f6f3ea]" />
          <div className="h-10 w-[150px] rounded-xl bg-[#f6f3ea]" />
          <div className="h-10 w-[140px] rounded-xl bg-[#f6f3ea]" />
          <div className="h-10 w-10 rounded-xl bg-[#f6f3ea]" />
        </div>
      </section>
    ),
  },
);

function getSectionVariants(reduceMotion: boolean): {
  container: Variants;
  section: Variants;
} {
  if (reduceMotion) {
    return {
      container: {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { duration: 0.18, when: "beforeChildren", staggerChildren: 0.03 },
        },
      },
      section: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.14 } },
      },
    };
  }

  return {
    container: {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.32,
          ease: enterEase,
          when: "beforeChildren",
          staggerChildren: 0.07,
        },
      },
    },
    section: {
      hidden: { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.26, ease: enterEase },
      },
    },
  };
}

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function inferDayGroup(dateISO: string): ExpenseDayGroup {
  const current = new Date();
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const targetDate = new Date(`${dateISO}T00:00:00`);
  const target = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  const diffInDays = Math.floor((today.getTime() - target.getTime()) / 86_400_000);

  if (diffInDays === 0) {
    return "hoje";
  }

  if (diffInDays === 1) {
    return "ontem";
  }

  if (diffInDays > 1 && diffInDays <= 7) {
    return "esta-semana";
  }

  return "anteriores";
}

function formatDateLabel(dateISO: string, dayGroup: ExpenseDayGroup) {
  if (dayGroup === "hoje") {
    return "Hoje";
  }

  if (dayGroup === "ontem") {
    return "Ontem";
  }

  const date = new Date(`${dateISO}T00:00:00`);

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toISODateLocal(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    dateFrom: toISODateLocal(firstDay),
    dateTo: toISODateLocal(lastDay),
  };
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mergeSavedFilters(
  defaults: ExpenseFilterState,
  saved: Partial<ExpenseFilterState> | null,
): ExpenseFilterState {
  if (!saved) {
    return defaults;
  }

  const next: ExpenseFilterState = {
    ...defaults,
    search: typeof saved.search === "string" ? saved.search : defaults.search,
    category:
      saved.category === "todas" || (typeof saved.category === "string" && saved.category in expenseCategoryLabels)
        ? (saved.category as ExpenseFilterState["category"])
        : defaults.category,
    card: typeof saved.card === "string" ? saved.card : defaults.card,
    status:
      saved.status === "todos" || saved.status === "pago" || saved.status === "pendente" || saved.status === "atrasado"
        ? saved.status
        : defaults.status,
    type:
      saved.type === "todos" || saved.type === "unica" || saved.type === "recorrente"
        ? saved.type
        : defaults.type,
    mode:
      saved.mode === "todas" || saved.mode === "despesas" || saved.mode === "receitas"
        ? saved.mode
        : defaults.mode,
    dateFrom: isISODate(saved.dateFrom) ? saved.dateFrom : defaults.dateFrom,
    dateTo: isISODate(saved.dateTo) ? saved.dateTo : defaults.dateTo,
  };

  if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) {
    return {
      ...next,
      dateTo: next.dateFrom,
    };
  }

  return next;
}

function categoryFromApi(value: string): ExpenseCategory {
  if (value in expenseCategoryLabels) {
    return value as ExpenseCategory;
  }

  return "outros";
}

function mapAccount(apiCard: ApiCardDto): ExpenseAccount {
  return {
    id: apiCard.id,
    name: apiCard.name,
    type: apiCard.type,
    last4Digits: apiCard.last4Digits,
    creditLimitCents: apiCard.creditLimitCents,
    initialBalanceCents: apiCard.initialBalanceCents,
    isActive: apiCard.isActive,
    availableCents: apiCard.metrics.availableCents,
    incomeTotalCents: apiCard.metrics.incomeTotalCents,
    expenseTotalCents: apiCard.metrics.expenseTotalCents,
    creditUsedCents: apiCard.metrics.creditUsedCents,
    utilizationPct: apiCard.metrics.utilizationPct,
  };
}

function mapTransaction(
  item: ApiTransactionDto,
  accountNameById: Map<string, string>,
): ExpenseItem {
  const dateISO = item.occurredAt.slice(0, 10);
  const dayGroup = inferDayGroup(dateISO);

  return {
    id: item.id,
    seriesId: item.seriesId,
    kind: item.kind,
    merchant: item.merchant,
    description: item.description,
    category: categoryFromApi(item.category),
    status: item.status,
    type: item.frequency === "recorrente" ? "recorrente" : "unica",
    accountId: item.accountId,
    accountName: accountNameById.get(item.accountId) ?? "Conta inativa",
    amount: item.amountCents / 100,
    dateISO,
    dateLabel: formatDateLabel(dateISO, dayGroup),
    dayGroup,
    isInstallment: item.isInstallment,
    installmentIndex: item.installmentIndex,
    installmentTotal: item.installmentTotal,
    isRecurring: item.isRecurring,
  };
}

async function readApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const rawText = await response.text();
  const parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;

  if (!response.ok) {
    const apiError = (parsed ?? {}) as ApiErrorResponse;
    throw new ApiRequestError(
      apiError.error?.message ?? "Falha ao processar a requisição.",
      response.status,
      apiError.error?.code,
    );
  }

  return parsed as T;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiRequestError)) {
    return fallback;
  }

  if (error.code === "INSUFFICIENT_AVAILABLE_BALANCE") {
    return "Saldo ou limite disponível insuficiente para esta transação.";
  }

  return error.message || fallback;
}

export default function ExpensesMain() {
  const prefersReducedMotion = useReducedMotion();
  const variants = getSectionVariants(Boolean(prefersReducedMotion));
  const queryClient = useQueryClient();
  const financeSnapshotQuery = useFinanceSnapshotQuery();
  const [hasRestoredFilters, setHasRestoredFilters] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilterState>(() => ({
    ...expenseFilterDefaults,
    ...getCurrentMonthDateRange(),
  }));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const { accounts, expenses } = useMemo(() => {
    const snapshot = financeSnapshotQuery.data;
    if (!snapshot) {
      return { accounts: [] as ExpenseAccount[], expenses: [] as ExpenseItem[] };
    }

    const mappedAccounts = snapshot.cards
      .filter((card) => card.isActive)
      .map(mapAccount);
    const accountNameById = new Map(
      mappedAccounts.map((account) => [account.id, account.name] as const),
    );
    const mappedTransactions = snapshot.transactions.map((item) =>
      mapTransaction(item, accountNameById),
    );

    return {
      accounts: mappedAccounts,
      expenses: mappedTransactions,
    };
  }, [financeSnapshotQuery.data]);

  const isLoading = financeSnapshotQuery.isLoading;
  const isRefreshing = financeSnapshotQuery.isFetching && !financeSnapshotQuery.isLoading;

  const editingExpense = useMemo(
    () => expenses.find((expense) => expense.id === editingExpenseId) ?? null,
    [editingExpenseId, expenses],
  );

  useEffect(() => {
    if (!financeSnapshotQuery.isError) {
      return;
    }

    toast.error(getApiErrorMessage(financeSnapshotQuery.error, "Não foi possível carregar suas transações."));
  }, [
    financeSnapshotQuery.error,
    financeSnapshotQuery.errorUpdatedAt,
    financeSnapshotQuery.isError,
  ]);

  const handleRealtimeRefresh = useCallback(async () => {
    await invalidateFinanceSnapshotQuery(queryClient);
  }, [queryClient]);

  useTelegramRealtimeRefresh({
    onRefresh: handleRealtimeRefresh,
    toastMessage: "Nova despesa via Telegram.",
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const defaults: ExpenseFilterState = {
      ...expenseFilterDefaults,
      ...getCurrentMonthDateRange(),
    };
    const saved = readCookieJson<Partial<ExpenseFilterState>>(TRANSACTIONS_FILTERS_COOKIE);
    setFilters(mergeSavedFilters(defaults, saved));
    setHasRestoredFilters(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredFilters) {
      return;
    }

    writeCookieJson(TRANSACTIONS_FILTERS_COOKIE, filters);
  }, [filters, hasRestoredFilters]);

  const categoryOptions = useMemo(
    () => [
      { value: "todas" as const, label: "Categories" },
      ...Object.entries(expenseCategoryLabels).map(([value, label]) => ({
        value: value as ExpenseCategory,
        label,
      })),
    ],
    [],
  );

  const cardOptions = useMemo(
    () => [
      { value: "all" as const, label: "All Cards" },
      ...accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
    ],
    [accounts],
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (filters.card === "all") {
      return;
    }

    const cardExists = accounts.some((account) => account.id === filters.card);
    if (!cardExists) {
      setFilters((previous) => ({ ...previous, card: "all" }));
    }
  }, [accounts, filters.card, isLoading]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const statusOptions = useMemo(
    () => [
      { value: "todos" as const, label: "Todos" },
      ...Object.entries(expenseStatusFilterLabels).map(([value, label]) => ({
        value: value as ExpenseStatus,
        label,
      })),
    ],
    [],
  );

  const typeOptions = useMemo(
    () => [
      { value: "todos" as const, label: "Todos" },
      ...Object.entries(expenseTypeLabels).map(([value, label]) => ({
        value: value as ExpenseType,
        label,
      })),
    ],
    [],
  );

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(filters.search.trim());

    return expenses
      .filter((expense) => {
        if (filters.mode === "despesas" && expense.kind !== "expense") {
          return false;
        }

        if (filters.mode === "receitas" && expense.kind !== "income") {
          return false;
        }

        if (filters.category !== "todas" && expense.category !== filters.category) {
          return false;
        }

        if (filters.card !== "all" && expense.accountId !== filters.card) {
          return false;
        }

        if (filters.status !== "todos" && expense.status !== filters.status) {
          return false;
        }

        if (filters.type !== "todos" && expense.type !== filters.type) {
          return false;
        }

        if (filters.dateFrom && expense.dateISO < filters.dateFrom) {
          return false;
        }

        if (filters.dateTo && expense.dateISO > filters.dateTo) {
          return false;
        }

        if (normalizedSearch) {
          const haystack = normalizeSearchValue(
            `${expense.merchant} ${expense.description} ${expenseCategoryLabels[expense.category]} ${expense.accountName}`,
          );

          if (!haystack.includes(normalizedSearch)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.dateISO === b.dateISO) {
          return b.amount - a.amount;
        }

        return b.dateISO.localeCompare(a.dateISO);
      });
  }, [expenses, filters]);

  function handleModeChange(mode: ExpenseViewMode) {
    setFilters((previous) => ({ ...previous, mode }));
  }

  function handleClearFilters() {
    const currentMonthRange = getCurrentMonthDateRange();

    setFilters((previous) => ({
      ...expenseFilterDefaults,
      ...currentMonthRange,
      mode: previous.mode,
    }));
  }

  function handleDateFromChange(value: string) {
    setFilters((previous) => ({
      ...previous,
      dateFrom: value,
      dateTo:
        previous.dateTo && value && previous.dateTo < value
          ? value
          : previous.dateTo,
    }));
  }

  function handleDateToChange(value: string) {
    setFilters((previous) => ({
      ...previous,
      dateTo: value,
      dateFrom:
        previous.dateFrom && value && previous.dateFrom > value
          ? value
          : previous.dateFrom,
    }));
  }

  async function handleAddExpense(payload: NewExpenseInput) {
    try {
      const response = await readApiJson<{ items: ApiTransactionDto[] }>(
        "/api/transactions",
        {
          method: "POST",
          body: JSON.stringify({
            accountId: payload.accountId,
            kind: payload.kind,
            status: payload.status,
            frequency: payload.type,
            category: payload.category,
            merchant: payload.merchant,
            description: payload.description,
            amountCents: Math.round(payload.amount * 100),
            occurredAt: payload.dateISO,
            isInstallment: payload.isInstallment,
            installmentTotal: payload.isInstallment ? payload.installmentTotal : 1,
            isRecurring: payload.isRecurring,
          }),
        },
      );

      await invalidateFinanceSnapshotQuery(queryClient);

      if (response.items.length > 1) {
        toast.success(`${response.items.length} parcelas adicionadas com sucesso.`);
      } else {
        toast.success("Transação adicionada com sucesso.");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível adicionar a transação."));
      throw error;
    }
  }

  async function handleUpdateExpense(payload: UpdateExpenseInput) {
    try {
      const result = await readApiJson<{ appliedScope: ApiScope }>(
        `/api/transactions/${payload.targetId}?scope=${payload.scope}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            accountId: payload.accountId,
            status: payload.status,
            category: payload.category,
            merchant: payload.merchant,
            description: payload.description,
            amountCents: Math.round(payload.amount * 100),
            occurredAt: payload.dateISO,
          }),
        },
      );

      await invalidateFinanceSnapshotQuery(queryClient);
      toast.success(
        result.appliedScope === "series"
          ? "Série atualizada com sucesso."
          : "Lançamento atualizado com sucesso.",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível atualizar a transação."));
      throw error;
    }
  }

  async function handleDeleteExpense(payload: DeleteExpenseInput) {
    try {
      const result = await readApiJson<{ appliedScope: ApiScope; deletedCount: number }>(
        `/api/transactions/${payload.targetId}?scope=${payload.scope}`,
        {
          method: "DELETE",
        },
      );

      await invalidateFinanceSnapshotQuery(queryClient);
      toast.success(
        result.appliedScope === "series"
          ? "Série excluída com sucesso."
          : "Lançamento excluído com sucesso.",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível excluir a transação."));
      throw error;
    }
  }

  function handleCloseModal() {
    setIsCreateModalOpen(false);
    setEditingExpenseId(null);
  }

  if (isLoading) {
    return (
      <main className="relative min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(134.5deg,#f8f7f6_0%,#eceae5_100%)]">
        <div className="relative mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-24 rounded-3xl bg-white/80" />
          <Skeleton className="h-14 rounded-2xl bg-white/80" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-36 rounded-3xl bg-white/80" />
            <Skeleton className="h-36 rounded-3xl bg-white/80" />
            <Skeleton className="h-36 rounded-3xl bg-white/80" />
            <Skeleton className="h-36 rounded-3xl bg-white/80" />
          </div>
          <Skeleton className="h-[360px] rounded-3xl bg-white/80" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(134.5deg,#f8f7f6_0%,#eceae5_100%)]">
      <div className="pointer-events-none absolute -right-28 -top-24 h-[440px] w-[440px] rounded-full bg-[#b38c19]/5 blur-3xl" />

      <motion.div
        className="relative mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8"
        initial="hidden"
        animate="visible"
        variants={variants.container}
      >
        <motion.section variants={variants.section}>
          <ExpensesHeader mode={filters.mode} onModeChange={handleModeChange} />
        </motion.section>

        <motion.section variants={variants.section}>
          <ExpensesToolbar
            search={filters.search}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            category={filters.category}
            card={filters.card}
            status={filters.status}
            type={filters.type}
            categoryOptions={categoryOptions}
            cardOptions={cardOptions}
            statusOptions={statusOptions}
            typeOptions={typeOptions}
            onSearchChange={(value) =>
              setFilters((previous) => ({ ...previous, search: value }))
            }
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            onCategoryChange={(value) =>
              setFilters((previous) => ({ ...previous, category: value }))
            }
            onCardChange={(value) =>
              setFilters((previous) => ({ ...previous, card: value }))
            }
            onStatusChange={(value) =>
              setFilters((previous) => ({ ...previous, status: value }))
            }
            onTypeChange={(value) =>
              setFilters((previous) => ({ ...previous, type: value }))
            }
            onClear={handleClearFilters}
          />
        </motion.section>

        <motion.section variants={variants.section}>
          <ExpenseSummaryCards
            expenses={filteredExpenses}
            accounts={accounts}
            selectedCardId={filters.card}
          />
        </motion.section>

        <motion.section variants={variants.section}>
          <ExpenseGroupedList
            expenses={filteredExpenses}
            onExpenseClick={(expense) => {
              setIsCreateModalOpen(false);
              setEditingExpenseId(expense.id);
            }}
          />
        </motion.section>

        {isRefreshing ? (
          <motion.p
            variants={variants.section}
            className="text-sm text-[#7a735f]"
          >
            Atualizando dados...
          </motion.p>
        ) : null}
      </motion.div>

      <button
        type="button"
        onClick={() => {
          setEditingExpenseId(null);
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b38c19] text-white shadow-[0px_14px_28px_-10px_rgba(179,140,25,0.75)] transition hover:bg-[#9f7b17]"
        aria-label="Adicionar nova transação"
      >
        <Plus className="h-5 w-5" />
      </button>

      <ExpenseAddModal
        open={isCreateModalOpen}
        accounts={accounts}
        onClose={handleCloseModal}
        onSubmit={handleAddExpense}
      />

      <ExpenseEditModal
        open={Boolean(editingExpense)}
        expense={editingExpense}
        accounts={accounts}
        onClose={handleCloseModal}
        onSubmitUpdate={handleUpdateExpense}
        onSubmitDelete={handleDeleteExpense}
      />
    </main>
  );
}
