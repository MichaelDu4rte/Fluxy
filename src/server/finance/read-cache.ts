import { revalidateTag, unstable_cache } from "next/cache";
import { listCardsForUser } from "@/src/server/finance/cards-service";
import { listTransactionsForUser } from "@/src/server/finance/transactions-service";
import type { TransactionsFilters } from "@/src/server/finance/types";

export const FINANCE_READ_REVALIDATE_SECONDS = 10;

type CardStatusFilter = "active" | "inactive" | "all";

const TRANSACTIONS_FILTER_FIELDS = [
  "search",
  "dateFrom",
  "dateTo",
  "category",
  "accountId",
  "status",
  "frequency",
  "kindMode",
] as const;

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeTransactionsFilters(filters: TransactionsFilters): TransactionsFilters {
  return {
    search: normalizeOptionalText(filters.search),
    dateFrom: normalizeOptionalText(filters.dateFrom),
    dateTo: normalizeOptionalText(filters.dateTo),
    category: normalizeOptionalText(filters.category),
    accountId: normalizeOptionalText(filters.accountId),
    status: filters.status,
    frequency: filters.frequency,
    kindMode: filters.kindMode,
  };
}

function serializeTransactionsFilters(filters: TransactionsFilters): string {
  const normalized = normalizeTransactionsFilters(filters);
  const serialized: Record<string, string | null> = {};

  for (const field of TRANSACTIONS_FILTER_FIELDS) {
    const value = normalized[field];
    serialized[field] = typeof value === "string" ? value : null;
  }

  return JSON.stringify(serialized);
}

function financeUserTag(userId: string): string {
  return `finance:user:${userId}`;
}

function financeCardsTag(userId: string): string {
  return `finance:user:${userId}:cards`;
}

function financeTransactionsTag(userId: string): string {
  return `finance:user:${userId}:transactions`;
}

export async function getCachedCardsForUser(
  userId: string,
  statusFilter: CardStatusFilter = "active",
) {
  const normalizedUserId = userId.trim();

  const loadCards = unstable_cache(
    async () => listCardsForUser(normalizedUserId, statusFilter),
    ["finance", "cards", normalizedUserId, statusFilter],
    {
      revalidate: FINANCE_READ_REVALIDATE_SECONDS,
      tags: [financeUserTag(normalizedUserId), financeCardsTag(normalizedUserId)],
    },
  );

  return loadCards();
}

export async function getCachedTransactionsForUser(
  userId: string,
  filters: TransactionsFilters,
) {
  const normalizedUserId = userId.trim();
  const normalizedFilters = normalizeTransactionsFilters(filters);
  const serializedFilters = serializeTransactionsFilters(normalizedFilters);

  const loadTransactions = unstable_cache(
    async () => listTransactionsForUser(normalizedUserId, normalizedFilters),
    ["finance", "transactions", normalizedUserId, serializedFilters],
    {
      revalidate: FINANCE_READ_REVALIDATE_SECONDS,
      tags: [
        financeUserTag(normalizedUserId),
        financeTransactionsTag(normalizedUserId),
      ],
    },
  );

  return loadTransactions();
}

export function invalidateFinanceCacheForUser(userId: string): void {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return;
  }

  revalidateTag(financeUserTag(normalizedUserId), "max");
  revalidateTag(financeCardsTag(normalizedUserId), "max");
  revalidateTag(financeTransactionsTag(normalizedUserId), "max");
}
