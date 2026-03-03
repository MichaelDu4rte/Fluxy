import {
  FinancialAccountType,
  MarketProvider,
  TransactionFrequency,
  TransactionKind,
  TransactionStatus,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  computeAvailableCents,
  getCardMetrics,
  getSettledTotalsForAccount,
  type AccountBalanceSeed,
} from "@/src/server/finance/balance-service";
import { FinanceError } from "@/src/server/finance/errors";
import type {
  CardDto,
  CreateCardInput,
  InvestmentMetadataDto,
  UpdateCardInput,
} from "@/src/server/finance/types";
import {
  assertIntCents,
  assertLast4Digits,
  assertNonEmptyString,
  assertPositiveNumber,
  fromDbAccountType,
  fromDbMarketProvider,
  toDbAccountType,
  toDbMarketProvider,
} from "@/src/server/finance/validators";

const DEFAULT_BOOTSTRAP_INVESTMENT = {
  name: "Investimentos",
  type: FinancialAccountType.INVESTMENT,
  initialBalanceCents: 0,
} as const;

type CardStatusFilter = "active" | "inactive" | "all";

function toCardDto(
  account: {
    id: string;
    name: string;
    type: FinancialAccountType;
    investmentProvider: MarketProvider | null;
    investmentAssetId: string | null;
    investmentAssetSymbol: string | null;
    investmentAssetName: string | null;
    investmentEntryPriceBrl: number | null;
    last4Digits: string | null;
    creditLimitCents: number | null;
    initialBalanceCents: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  metrics: Awaited<ReturnType<typeof getCardMetrics>>,
): CardDto {
  const hasInvestmentMetadata = Boolean(
    account.investmentProvider
      && account.investmentAssetId
      && account.investmentAssetSymbol
      && account.investmentAssetName
      && typeof account.investmentEntryPriceBrl === "number",
  );

  return {
    id: account.id,
    name: account.name,
    type: fromDbAccountType(account.type),
    investment: hasInvestmentMetadata
      ? {
        provider: fromDbMarketProvider(account.investmentProvider as MarketProvider),
        assetId: account.investmentAssetId as string,
        assetSymbol: account.investmentAssetSymbol as string,
        assetName: account.investmentAssetName as string,
        entryPriceBrl: account.investmentEntryPriceBrl as number,
      }
      : null,
    last4Digits: account.last4Digits,
    creditLimitCents: account.creditLimitCents,
    initialBalanceCents: account.initialBalanceCents,
    isActive: account.isActive,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    metrics,
  };
}

function assertInvestmentMetadata(
  investment: CreateCardInput["investment"] | UpdateCardInput["investment"],
): InvestmentMetadataDto | null {
  if (!investment) {
    return null;
  }

  return {
    provider: investment.provider,
    assetId: assertNonEmptyString(investment.assetId, "Ativo"),
    assetSymbol: assertNonEmptyString(investment.assetSymbol, "Simbolo do ativo"),
    assetName: assertNonEmptyString(investment.assetName, "Nome do ativo"),
    entryPriceBrl: assertPositiveNumber(investment.entryPriceBrl, "Preco de entrada"),
  };
}

function getInvestmentMetadataFromAccount(account: {
  investmentProvider: MarketProvider | null;
  investmentAssetId: string | null;
  investmentAssetSymbol: string | null;
  investmentAssetName: string | null;
  investmentEntryPriceBrl: number | null;
}): InvestmentMetadataDto | null {
  if (
    !account.investmentProvider
    || !account.investmentAssetId
    || !account.investmentAssetSymbol
    || !account.investmentAssetName
    || typeof account.investmentEntryPriceBrl !== "number"
  ) {
    return null;
  }

  return {
    provider: fromDbMarketProvider(account.investmentProvider),
    assetId: account.investmentAssetId,
    assetSymbol: account.investmentAssetSymbol,
    assetName: account.investmentAssetName,
    entryPriceBrl: account.investmentEntryPriceBrl,
  };
}

async function ensureBootstrapAccount(userId: string): Promise<void> {
  const activeCount = await prisma.financialAccount.count({
    where: { userId, isActive: true },
  });

  if (activeCount > 0) {
    return;
  }

  await prisma.financialAccount.create({
    data: {
      userId,
      name: DEFAULT_BOOTSTRAP_INVESTMENT.name,
      type: DEFAULT_BOOTSTRAP_INVESTMENT.type,
      initialBalanceCents: DEFAULT_BOOTSTRAP_INVESTMENT.initialBalanceCents,
      isActive: true,
    },
  });
}

export async function listCardsForUser(
  userId: string,
  statusFilter: CardStatusFilter = "active",
): Promise<CardDto[]> {
  await ensureBootstrapAccount(userId);

  const statusWhere =
    statusFilter === "all"
      ? {}
      : { isActive: statusFilter === "active" };

  const accounts = await prisma.financialAccount.findMany({
    where: { userId, ...statusWhere },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    accounts.map(async (account) =>
      toCardDto(account, await getCardMetrics(prisma, userId, account)),
    ),
  );
}

export async function createCardForUser(
  userId: string,
  input: CreateCardInput,
): Promise<CardDto> {
  const normalizedName = assertNonEmptyString(input.name, "Nome");
  const dbType = toDbAccountType(input.type);
  const initialBalanceCents = assertIntCents(
    input.initialBalanceCents ?? 0,
    "Saldo inicial",
    { min: 0 },
  ) as number;

  const isCardType =
    dbType === FinancialAccountType.CREDIT || dbType === FinancialAccountType.DEBIT;
  const last4Digits = assertLast4Digits(input.last4Digits, isCardType);

  let creditLimitCents: number | null = null;
  if (dbType === FinancialAccountType.CREDIT) {
    creditLimitCents = assertIntCents(input.creditLimitCents, "Limite de credito", {
      min: 1,
    });
  }

  const investment = assertInvestmentMetadata(input.investment);
  if (dbType !== FinancialAccountType.INVESTMENT && investment) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Metadados de investimento so podem ser usados em contas de investimento.",
      400,
    );
  }

  const fundingSourceAccountId = input.fundingSourceAccountId?.trim() ?? "";

  if (dbType !== FinancialAccountType.INVESTMENT && fundingSourceAccountId) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Conta de origem do aporte so pode ser usada para investimentos.",
      400,
    );
  }

  if (
    dbType === FinancialAccountType.INVESTMENT
    && initialBalanceCents > 0
    && !fundingSourceAccountId
  ) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Selecione a conta/cartao de origem para o aporte inicial.",
      400,
    );
  }

  const account = await prisma.$transaction(async (tx) => {
    let validatedFundingSourceId: string | null = null;

    if (
      dbType === FinancialAccountType.INVESTMENT
      && initialBalanceCents > 0
      && fundingSourceAccountId
    ) {
      const fundingSource = await tx.financialAccount.findFirst({
        where: {
          id: fundingSourceAccountId,
          userId,
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          creditLimitCents: true,
          initialBalanceCents: true,
        },
      });

      if (!fundingSource) {
        throw new FinanceError("NOT_FOUND", "Conta/cartao de origem nao encontrada.", 404);
      }

      if (fundingSource.type === FinancialAccountType.INVESTMENT) {
        throw new FinanceError(
          "VALIDATION_ERROR",
          "A conta de origem precisa ser de credito ou debito.",
          400,
        );
      }

      const totals = await getSettledTotalsForAccount(tx, userId, fundingSource.id);
      const availableCents = computeAvailableCents(
        fundingSource as AccountBalanceSeed,
        totals,
      );

      if (availableCents < initialBalanceCents) {
        throw new FinanceError(
          "INSUFFICIENT_AVAILABLE_BALANCE",
          "Saldo/limite insuficiente para realizar o aporte inicial.",
          422,
        );
      }

      validatedFundingSourceId = fundingSource.id;
    }

    const created = await tx.financialAccount.create({
      data: {
        userId,
        name: normalizedName,
        type: dbType,
        last4Digits,
        creditLimitCents,
        initialBalanceCents,
        investmentProvider:
          dbType === FinancialAccountType.INVESTMENT && investment
            ? toDbMarketProvider(investment.provider)
            : null,
        investmentAssetId:
          dbType === FinancialAccountType.INVESTMENT ? investment?.assetId ?? null : null,
        investmentAssetSymbol:
          dbType === FinancialAccountType.INVESTMENT ? investment?.assetSymbol ?? null : null,
        investmentAssetName:
          dbType === FinancialAccountType.INVESTMENT ? investment?.assetName ?? null : null,
        investmentEntryPriceBrl:
          dbType === FinancialAccountType.INVESTMENT
            ? investment?.entryPriceBrl ?? null
            : null,
        isActive: true,
      },
    });

    if (
      dbType === FinancialAccountType.INVESTMENT
      && validatedFundingSourceId
      && initialBalanceCents > 0
    ) {
      await tx.financialTransaction.create({
        data: {
          userId,
          accountId: validatedFundingSourceId,
          kind: TransactionKind.EXPENSE,
          status: TransactionStatus.PAID,
          frequency: TransactionFrequency.ONE_OFF,
          category: "outros",
          merchant: `Aporte em ${investment?.assetSymbol?.toUpperCase() ?? "investimento"}`,
          description: `Aporte inicial para ${normalizedName}`,
          amountCents: initialBalanceCents,
          occurredAt: new Date(),
          isInstallment: false,
          installmentIndex: 1,
          installmentTotal: 1,
          isRecurring: false,
        },
      });
    }

    return created;
  });

  const metrics = await getCardMetrics(prisma, userId, account);
  return toCardDto(account, metrics);
}

export async function updateCardForUser(
  userId: string,
  cardId: string,
  input: UpdateCardInput,
): Promise<CardDto> {
  const existing = await prisma.financialAccount.findFirst({
    where: { id: cardId, userId },
  });

  if (!existing) {
    throw new FinanceError("NOT_FOUND", "Cartao nao encontrado.", 404);
  }

  const nextType =
    typeof input.type === "string"
      ? toDbAccountType(input.type)
      : existing.type;

  const nextName =
    typeof input.name === "string"
      ? assertNonEmptyString(input.name, "Nome")
      : existing.name;

  const nextIsActive =
    typeof input.isActive === "boolean"
      ? input.isActive
      : existing.isActive;

  const nextInitialBalance =
    typeof input.initialBalanceCents === "number"
      ? (assertIntCents(input.initialBalanceCents, "Saldo inicial", { min: 0 }) as number)
      : existing.initialBalanceCents;

  const existingInvestment = getInvestmentMetadataFromAccount(existing);
  const nextInvestmentFromInput =
    input.investment !== undefined
      ? assertInvestmentMetadata(input.investment)
      : undefined;

  let nextInvestment =
    nextInvestmentFromInput !== undefined
      ? nextInvestmentFromInput
      : existingInvestment;

  if (nextType !== FinancialAccountType.INVESTMENT) {
    nextInvestment = null;
  }

  if (nextType === FinancialAccountType.INVESTMENT && !nextInvestment) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Metadados do ativo sao obrigatorios para contas de investimento.",
      400,
    );
  }

  const needsLast4 =
    nextType === FinancialAccountType.CREDIT || nextType === FinancialAccountType.DEBIT;
  const nextLast4 = needsLast4
    ? assertLast4Digits(input.last4Digits ?? existing.last4Digits, true)
    : null;

  let nextCreditLimit: number | null = null;
  if (nextType === FinancialAccountType.CREDIT) {
    const creditLimitCandidate =
      typeof input.creditLimitCents === "number"
        ? input.creditLimitCents
        : existing.type === FinancialAccountType.CREDIT
        ? existing.creditLimitCents
        : null;
    nextCreditLimit = assertIntCents(creditLimitCandidate, "Limite de credito", {
      min: 1,
    });
  }

  const balanceDeltaCents = nextInitialBalance - existing.initialBalanceCents;
  const normalizedAdjustmentSourceId = input.adjustmentSourceAccountId?.trim() ?? "";
  const normalizedAdjustmentDestinationId = input.adjustmentDestinationAccountId?.trim() ?? "";

  if (balanceDeltaCents > 0 && !normalizedAdjustmentSourceId) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Selecione a conta/cartao de origem para o ajuste de saldo.",
      400,
    );
  }

  if (balanceDeltaCents < 0 && !normalizedAdjustmentDestinationId) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Selecione a conta/cartao de destino para o ajuste de saldo.",
      400,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const adjustmentAmountCents = Math.abs(balanceDeltaCents);

    if (balanceDeltaCents > 0) {
      if (normalizedAdjustmentSourceId === existing.id) {
        throw new FinanceError(
          "VALIDATION_ERROR",
          "A origem do ajuste precisa ser diferente da conta editada.",
          400,
        );
      }

      const sourceAccount = await tx.financialAccount.findFirst({
        where: {
          id: normalizedAdjustmentSourceId,
          userId,
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          creditLimitCents: true,
          initialBalanceCents: true,
        },
      });

      if (!sourceAccount) {
        throw new FinanceError("NOT_FOUND", "Conta/cartao de origem nao encontrado.", 404);
      }

      if (sourceAccount.type === FinancialAccountType.INVESTMENT) {
        throw new FinanceError(
          "VALIDATION_ERROR",
          "A conta de origem precisa ser de credito ou debito.",
          400,
        );
      }

      const totals = await getSettledTotalsForAccount(tx, userId, sourceAccount.id);
      const sourceAvailableCents = computeAvailableCents(
        sourceAccount as AccountBalanceSeed,
        totals,
      );

      if (sourceAvailableCents < adjustmentAmountCents) {
        throw new FinanceError(
          "INSUFFICIENT_AVAILABLE_BALANCE",
          "Saldo/limite insuficiente na conta de origem para ajustar o saldo.",
          422,
        );
      }
    }

    if (balanceDeltaCents < 0) {
      if (normalizedAdjustmentDestinationId === existing.id) {
        throw new FinanceError(
          "VALIDATION_ERROR",
          "A conta de destino precisa ser diferente da conta editada.",
          400,
        );
      }

      const destinationAccount = await tx.financialAccount.findFirst({
        where: {
          id: normalizedAdjustmentDestinationId,
          userId,
          isActive: true,
        },
        select: {
          id: true,
          type: true,
        },
      });

      if (!destinationAccount) {
        throw new FinanceError("NOT_FOUND", "Conta/cartao de destino nao encontrado.", 404);
      }

      if (destinationAccount.type === FinancialAccountType.INVESTMENT) {
        throw new FinanceError(
          "VALIDATION_ERROR",
          "A conta de destino precisa ser de credito ou debito.",
          400,
        );
      }
    }

    const account = await tx.financialAccount.update({
      where: { id: existing.id },
      data: {
        name: nextName,
        type: nextType,
        isActive: nextIsActive,
        initialBalanceCents: nextInitialBalance,
        last4Digits: nextLast4,
        creditLimitCents: nextCreditLimit,
        investmentProvider:
          nextType === FinancialAccountType.INVESTMENT && nextInvestment
            ? toDbMarketProvider(nextInvestment.provider)
            : null,
        investmentAssetId:
          nextType === FinancialAccountType.INVESTMENT
            ? nextInvestment?.assetId ?? null
            : null,
        investmentAssetSymbol:
          nextType === FinancialAccountType.INVESTMENT
            ? nextInvestment?.assetSymbol ?? null
            : null,
        investmentAssetName:
          nextType === FinancialAccountType.INVESTMENT
            ? nextInvestment?.assetName ?? null
            : null,
        investmentEntryPriceBrl:
          nextType === FinancialAccountType.INVESTMENT
            ? nextInvestment?.entryPriceBrl ?? null
            : null,
      },
    });

    if (balanceDeltaCents > 0) {
      await tx.financialTransaction.create({
        data: {
          userId,
          accountId: normalizedAdjustmentSourceId,
          kind: TransactionKind.EXPENSE,
          status: TransactionStatus.PAID,
          frequency: TransactionFrequency.ONE_OFF,
          category: "outros",
          merchant: `Ajuste para ${nextName}`,
          description: `Aporte de saldo ao editar ${nextName}`,
          amountCents: adjustmentAmountCents,
          occurredAt: new Date(),
          isInstallment: false,
          installmentIndex: 1,
          installmentTotal: 1,
          isRecurring: false,
        },
      });
    }

    if (balanceDeltaCents < 0) {
      await tx.financialTransaction.create({
        data: {
          userId,
          accountId: normalizedAdjustmentDestinationId,
          kind: TransactionKind.INCOME,
          status: TransactionStatus.PAID,
          frequency: TransactionFrequency.ONE_OFF,
          category: "outros",
          merchant: `Resgate de ${nextName}`,
          description: `Reducao de saldo ao editar ${nextName}`,
          amountCents: adjustmentAmountCents,
          occurredAt: new Date(),
          isInstallment: false,
          installmentIndex: 1,
          installmentTotal: 1,
          isRecurring: false,
        },
      });
    }

    return account;
  });

  const metrics = await getCardMetrics(prisma, userId, updated);
  return toCardDto(updated, metrics);
}

export async function deleteCardForUser(
  userId: string,
  cardId: string,
): Promise<{ id: string; action: "deleted" | "deactivated" }> {
  const existing = await prisma.financialAccount.findFirst({
    where: { id: cardId, userId },
  });

  if (!existing) {
    throw new FinanceError("NOT_FOUND", "Cartao nao encontrado.", 404);
  }

  const transactionsCount = await prisma.financialTransaction.count({
    where: { userId, accountId: existing.id },
  });

  if (transactionsCount === 0) {
    await prisma.financialAccount.delete({ where: { id: existing.id } });
    return { id: existing.id, action: "deleted" };
  }

  await prisma.financialAccount.update({
    where: { id: existing.id },
    data: { isActive: false },
  });
  return { id: existing.id, action: "deactivated" };
}
