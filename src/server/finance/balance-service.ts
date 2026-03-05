import { FinancialAccountType, TransactionKind, TransactionStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { CardMetricsDto } from "@/src/server/finance/types";

type FinancialReader = Pick<typeof prisma, "financialTransaction">;

type SettledTotals = {
  incomeCents: number;
  expenseCents: number;
};

export type AccountBalanceSeed = {
  id: string;
  type: FinancialAccountType;
  creditLimitCents: number | null;
  initialBalanceCents: number;
};

export async function getSettledTotalsForAccounts(
  reader: FinancialReader,
  userId: string,
  accountIds: string[],
): Promise<Map<string, SettledTotals>> {
  const uniqueAccountIds = [...new Set(accountIds.map((id) => id.trim()).filter(Boolean))];
  const totalsByAccount = new Map<string, SettledTotals>();

  for (const accountId of uniqueAccountIds) {
    totalsByAccount.set(accountId, {
      incomeCents: 0,
      expenseCents: 0,
    });
  }

  if (uniqueAccountIds.length === 0) {
    return totalsByAccount;
  }

  const groupedRows = await reader.financialTransaction.groupBy({
    by: ["accountId", "kind"],
    where: {
      userId,
      accountId: { in: uniqueAccountIds },
      status: TransactionStatus.PAID,
    },
    _sum: { amountCents: true },
  });

  for (const row of groupedRows) {
    const totals = totalsByAccount.get(row.accountId);

    if (!totals) {
      continue;
    }

    const amountCents = row._sum.amountCents ?? 0;
    if (row.kind === TransactionKind.INCOME) {
      totals.incomeCents = amountCents;
      continue;
    }

    if (row.kind === TransactionKind.EXPENSE) {
      totals.expenseCents = amountCents;
    }
  }

  return totalsByAccount;
}

export async function getSettledTotalsForAccount(
  reader: FinancialReader,
  userId: string,
  accountId: string,
): Promise<SettledTotals> {
  const totalsByAccount = await getSettledTotalsForAccounts(reader, userId, [accountId]);
  return totalsByAccount.get(accountId) ?? { incomeCents: 0, expenseCents: 0 };
}

export function computeAvailableCents(
  account: AccountBalanceSeed,
  totals: SettledTotals,
): number {
  const baseline =
    account.type === FinancialAccountType.CREDIT
      ? account.creditLimitCents ?? 0
      : account.initialBalanceCents;

  return baseline + totals.incomeCents - totals.expenseCents;
}

function buildCardMetrics(account: AccountBalanceSeed, totals: SettledTotals): CardMetricsDto {
  const availableCents = computeAvailableCents(account, totals);
  const creditLimit = account.creditLimitCents ?? 0;
  const creditUsedCents =
    account.type === FinancialAccountType.CREDIT
      ? Math.max(0, creditLimit - availableCents)
      : 0;
  const utilizationPct =
    account.type === FinancialAccountType.CREDIT && creditLimit > 0
      ? Number(((creditUsedCents / creditLimit) * 100).toFixed(2))
      : 0;

  return {
    availableCents,
    incomeTotalCents: totals.incomeCents,
    expenseTotalCents: totals.expenseCents,
    creditUsedCents,
    utilizationPct,
  };
}

export async function getCardMetricsForAccounts(
  reader: FinancialReader,
  userId: string,
  accounts: AccountBalanceSeed[],
): Promise<Map<string, CardMetricsDto>> {
  const metricsByAccount = new Map<string, CardMetricsDto>();
  const totalsByAccount = await getSettledTotalsForAccounts(
    reader,
    userId,
    accounts.map((account) => account.id),
  );

  for (const account of accounts) {
    const totals = totalsByAccount.get(account.id) ?? { incomeCents: 0, expenseCents: 0 };
    metricsByAccount.set(account.id, buildCardMetrics(account, totals));
  }

  return metricsByAccount;
}

export async function getCardMetrics(
  reader: FinancialReader,
  userId: string,
  account: AccountBalanceSeed,
): Promise<CardMetricsDto> {
  const totals = await getSettledTotalsForAccount(reader, userId, account.id);
  return buildCardMetrics(account, totals);
}
