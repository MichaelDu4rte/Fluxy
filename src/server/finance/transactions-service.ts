import {
  TransactionKind,
  TransactionFrequency,
  TransactionStatus,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  computeAvailableCents,
  getSettledTotalsForAccount,
  type AccountBalanceSeed,
} from "@/src/server/finance/balance-service";
import { FinanceError } from "@/src/server/finance/errors";
import type {
  ApiScope,
  CreateTransactionInput,
  TransactionDto,
  TransactionsFilters,
  TransactionsSummaryDto,
  UpdateTransactionInput,
} from "@/src/server/finance/types";
import {
  assertCategory,
  assertDate,
  assertIntCents,
  assertNonEmptyString,
  fromDbFrequency,
  fromDbKind,
  fromDbStatus,
  toDbFrequency,
  toDbKind,
  toDbStatus,
} from "@/src/server/finance/validators";

type TransactionRecord = {
  id: string;
  accountId: string;
  kind: TransactionKind;
  status: TransactionStatus;
  frequency: TransactionFrequency;
  category: string;
  merchant: string;
  description: string | null;
  amountCents: number;
  occurredAt: Date;
  seriesId: string | null;
  isInstallment: boolean;
  installmentIndex: number;
  installmentTotal: number;
  isRecurring: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toTransactionDto(record: TransactionRecord): TransactionDto {
  return {
    id: record.id,
    accountId: record.accountId,
    kind: fromDbKind(record.kind),
    status: fromDbStatus(record.status),
    frequency: fromDbFrequency(record.frequency),
    category: record.category,
    merchant: record.merchant,
    description: record.description ?? "",
    amountCents: record.amountCents,
    occurredAt: record.occurredAt.toISOString(),
    seriesId: record.seriesId,
    isInstallment: record.isInstallment,
    installmentIndex: record.installmentIndex,
    installmentTotal: record.installmentTotal,
    isRecurring: record.isRecurring,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addMonthsKeepingDay(date: Date, offset: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return startOfDay(result);
}

function splitInstallments(totalCents: number, count: number): number[] {
  if (count <= 1) {
    return [totalCents];
  }

  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) =>
    base + (index === count - 1 ? remainder : 0),
  );
}

function buildSummary(items: TransactionDto[]): TransactionsSummaryDto {
  const outflowCents = items
    .filter((item) => item.kind === "expense")
    .reduce((acc, item) => acc + item.amountCents, 0);

  const inflowCents = items
    .filter((item) => item.kind === "income")
    .reduce((acc, item) => acc + item.amountCents, 0);

  const pendingOpenCents = items
    .filter((item) => item.status !== "pago")
    .reduce((acc, item) => acc + item.amountCents, 0);

  return {
    outflowCents,
    inflowCents,
    netCents: inflowCents - outflowCents,
    pendingOpenCents,
    totalCount: items.length,
  };
}

async function ensureAccountAvailabilityNonNegative(
  tx: Pick<typeof prisma, "financialAccount" | "financialTransaction">,
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await tx.financialAccount.findFirst({
    where: { id: accountId, userId },
    select: {
      id: true,
      type: true,
      creditLimitCents: true,
      initialBalanceCents: true,
    },
  });

  if (!account) {
    return;
  }

  const totals = await getSettledTotalsForAccount(tx, userId, account.id);
  const availableCents = computeAvailableCents(
    account as AccountBalanceSeed,
    totals,
  );

  if (availableCents < 0) {
    throw new FinanceError(
      "INSUFFICIENT_AVAILABLE_BALANCE",
      "Saldo/limite insuficiente para concluir esta operação.",
      422,
    );
  }
}

export async function listTransactionsForUser(
  userId: string,
  filters: TransactionsFilters,
): Promise<{ items: TransactionDto[]; summary: TransactionsSummaryDto }> {
  const where: NonNullable<
    Parameters<typeof prisma.financialTransaction.findMany>[0]
  >["where"] = { userId };

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { merchant: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  if (filters.category && filters.category !== "todas") {
    where.category = filters.category;
  }

  if (filters.accountId && filters.accountId !== "all") {
    where.accountId = filters.accountId;
  }

  if (filters.status && filters.status !== "todos") {
    where.status = toDbStatus(filters.status);
  }

  if (filters.frequency && filters.frequency !== "todos") {
    where.frequency = toDbFrequency(filters.frequency);
  }

  if (filters.kindMode === "despesas") {
    where.kind = TransactionKind.EXPENSE;
  }

  if (filters.kindMode === "receitas") {
    where.kind = TransactionKind.INCOME;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.occurredAt = {};
    if (filters.dateFrom) {
      where.occurredAt.gte = startOfDay(assertDate(filters.dateFrom, "Data inicial"));
    }
    if (filters.dateTo) {
      where.occurredAt.lte = endOfDay(assertDate(filters.dateTo, "Data final"));
    }
  }

  const records = await prisma.financialTransaction.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const items = records.map((record) => toTransactionDto(record as TransactionRecord));
  return { items, summary: buildSummary(items) };
}

export async function createTransactionsForUser(
  userId: string,
  input: CreateTransactionInput,
): Promise<{ items: TransactionDto[] }> {
  const accountId = assertNonEmptyString(input.accountId, "Conta");
  const merchant = assertNonEmptyString(input.merchant, "Título");
  const category = assertCategory(input.category);
  const amountCents = assertIntCents(input.amountCents, "Valor", { min: 1 }) as number;
  const occurredAtBase = assertDate(input.occurredAt, "Data");
  const dbKind = toDbKind(input.kind);
  const dbStatus = toDbStatus(input.status);
  const dbFrequency = input.isRecurring ? toDbFrequency("recorrente") : toDbFrequency(input.frequency);
  const isRecurring =
    input.isRecurring || dbFrequency === TransactionFrequency.RECURRING;
  const isInstallment = Boolean(input.isInstallment);
  const installmentTotal = isInstallment
    ? Math.min(24, Math.max(2, input.installmentTotal))
    : 1;

  if (isInstallment && isRecurring) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Uma transação não pode ser parcelada e recorrente ao mesmo tempo.",
      400,
    );
  }

  const descriptionRaw = input.description?.trim() ?? "";
  const installmentValues = splitInstallments(amountCents, installmentTotal);
  const seriesId =
    isInstallment || isRecurring ? `series-${crypto.randomUUID()}` : null;

  const createdItems = await prisma.$transaction(async (tx) => {
    const account = await tx.financialAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: {
        id: true,
        type: true,
        creditLimitCents: true,
        initialBalanceCents: true,
      },
    });

    if (!account) {
      throw new FinanceError("NOT_FOUND", "Conta/cartão não encontrado.", 404);
    }

    if (dbKind === TransactionKind.EXPENSE && dbStatus === TransactionStatus.PAID) {
      const totals = await getSettledTotalsForAccount(tx, userId, account.id);
      const available = computeAvailableCents(
        account as AccountBalanceSeed,
        totals,
      );
      const totalExpenseToApply = installmentValues.reduce((acc, value) => acc + value, 0);

      if (available < totalExpenseToApply) {
        throw new FinanceError(
          "INSUFFICIENT_AVAILABLE_BALANCE",
          "Saldo/limite insuficiente para essa despesa.",
          422,
        );
      }
    }

    const created = await Promise.all(
      installmentValues.map((installmentAmountCents, index) => {
        const occurredAt = addMonthsKeepingDay(occurredAtBase, index);
        const autoDescription = isInstallment
          ? `Parcela ${index + 1}/${installmentTotal}`
          : isRecurring
            ? "Transação recorrente mensal"
            : "Transação única";

        return tx.financialTransaction.create({
          data: {
            userId,
            accountId: account.id,
            kind: dbKind,
            status: dbStatus,
            frequency: dbFrequency,
            category,
            merchant,
            description: descriptionRaw || autoDescription,
            amountCents: installmentAmountCents,
            occurredAt,
            seriesId,
            isInstallment,
            installmentIndex: isInstallment ? index + 1 : 1,
            installmentTotal: isInstallment ? installmentTotal : 1,
            isRecurring,
          },
        });
      }),
    );

    return created;
  });

  return {
    items: createdItems.map((item) => toTransactionDto(item as TransactionRecord)),
  };
}

export async function updateTransactionsForUser(
  userId: string,
  targetId: string,
  scope: ApiScope,
  input: UpdateTransactionInput,
): Promise<{ items: TransactionDto[]; appliedScope: ApiScope }> {
  const merchant = assertNonEmptyString(input.merchant, "Título");
  const category = assertCategory(input.category);
  const amountCents = assertIntCents(input.amountCents, "Valor", { min: 1 }) as number;
  const occurredAt = assertDate(input.occurredAt, "Data");
  const accountId = assertNonEmptyString(input.accountId, "Conta");
  const status = toDbStatus(input.status);
  const description = input.description?.trim() ?? "";

  return prisma.$transaction(async (tx) => {
    const target = await tx.financialTransaction.findFirst({
      where: { id: targetId, userId },
      select: { id: true, seriesId: true },
    });

    if (!target) {
      throw new FinanceError("NOT_FOUND", "Lançamento não encontrado.", 404);
    }

    const account = await tx.financialAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: { id: true },
    });

    if (!account) {
      throw new FinanceError("NOT_FOUND", "Conta/cartão não encontrado.", 404);
    }

    const applySeries = scope === "series" && Boolean(target.seriesId);
    const appliedScope: ApiScope = applySeries ? "series" : "item";
    const whereAffected = applySeries
      ? { userId, seriesId: target.seriesId ?? undefined }
      : { id: target.id, userId };

    const before = await tx.financialTransaction.findMany({
      where: whereAffected,
      select: { accountId: true },
    });

    await tx.financialTransaction.updateMany({
      where: whereAffected,
      data: {
        merchant,
        description: description || "Transação atualizada",
        amountCents,
        category,
        status,
        accountId: account.id,
        occurredAt,
      },
    });

    const impactedAccountIds = new Set<string>([
      ...before.map((item) => item.accountId),
      account.id,
    ]);

    for (const impactedAccountId of impactedAccountIds) {
      await ensureAccountAvailabilityNonNegative(tx, userId, impactedAccountId);
    }

    const updatedItems = await tx.financialTransaction.findMany({
      where: whereAffected,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      appliedScope,
      items: updatedItems.map((item) => toTransactionDto(item as TransactionRecord)),
    };
  });
}

export async function deleteTransactionsForUser(
  userId: string,
  targetId: string,
  scope: ApiScope,
): Promise<{ deletedCount: number; appliedScope: ApiScope }> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.financialTransaction.findFirst({
      where: { id: targetId, userId },
      select: { id: true, seriesId: true },
    });

    if (!target) {
      throw new FinanceError("NOT_FOUND", "Lançamento não encontrado.", 404);
    }

    const applySeries = scope === "series" && Boolean(target.seriesId);
    const appliedScope: ApiScope = applySeries ? "series" : "item";
    const whereDelete = applySeries
      ? { userId, seriesId: target.seriesId ?? undefined }
      : { id: target.id, userId };

    const before = await tx.financialTransaction.findMany({
      where: whereDelete,
      select: { accountId: true },
    });

    const result = await tx.financialTransaction.deleteMany({
      where: whereDelete,
    });

    const impactedAccountIds = [...new Set(before.map((item) => item.accountId))];
    for (const impactedAccountId of impactedAccountIds) {
      await ensureAccountAvailabilityNonNegative(tx, userId, impactedAccountId);
    }

    return { deletedCount: result.count, appliedScope };
  });
}
