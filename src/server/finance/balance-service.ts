import { FinancialAccountType, TransactionKind, TransactionStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { CardMetricsDto } from "@/src/server/finance/types";

type FinancialReader = Pick<typeof prisma, "financialTransaction">;

export type AccountBalanceSeed = {
  id: string;
  type: FinancialAccountType;
  creditLimitCents: number | null;
  initialBalanceCents: number;
};

export async function getSettledTotalsForAccount(
  reader: FinancialReader,
  userId: string,
  accountId: string,
): Promise<{ incomeCents: number; expenseCents: number }> {
  const [incomeAgg, expenseAgg] = await Promise.all([
    reader.financialTransaction.aggregate({
      where: {
        userId,
        accountId,
        status: TransactionStatus.PAID,
        kind: TransactionKind.INCOME,
      },
      _sum: { amountCents: true },
    }),
    reader.financialTransaction.aggregate({
      where: {
        userId,
        accountId,
        status: TransactionStatus.PAID,
        kind: TransactionKind.EXPENSE,
      },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    incomeCents: incomeAgg._sum.amountCents ?? 0,
    expenseCents: expenseAgg._sum.amountCents ?? 0,
  };
}

export function computeAvailableCents(
  account: AccountBalanceSeed,
  totals: { incomeCents: number; expenseCents: number },
): number {
  const baseline =
    account.type === FinancialAccountType.CREDIT
      ? account.creditLimitCents ?? 0
      : account.initialBalanceCents;

  return baseline + totals.incomeCents - totals.expenseCents;
}

export async function getCardMetrics(
  reader: FinancialReader,
  userId: string,
  account: AccountBalanceSeed,
): Promise<CardMetricsDto> {
  const totals = await getSettledTotalsForAccount(reader, userId, account.id);
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
