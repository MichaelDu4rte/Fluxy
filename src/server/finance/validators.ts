import {
  FinancialAccountType,
  MarketProvider,
  TransactionFrequency,
  TransactionKind,
  TransactionStatus,
} from "@/lib/generated/prisma/enums";
import { FinanceError } from "@/src/server/finance/errors";
import type {
  ApiFinancialAccountType,
  ApiMarketProvider,
  ApiTransactionFrequency,
  ApiTransactionKind,
  ApiTransactionStatus,
} from "@/src/server/finance/types";

export const ALLOWED_CATEGORIES = [
  "moradia",
  "alimentacao",
  "transporte",
  "assinaturas",
  "lazer",
  "saude",
  "educacao",
  "outros",
] as const;

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `${field} inválido.`,
      400,
    );
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `${field} é obrigatório.`,
      400,
    );
  }

  return normalized;
}

export function assertOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return assertNonEmptyString(value, field);
}

export function assertIntCents(
  value: unknown,
  field: string,
  options?: { min?: number; allowNull?: boolean },
): number | null {
  if (value === null && options?.allowNull) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `${field} deve ser inteiro em centavos.`,
      400,
    );
  }

  if (typeof options?.min === "number" && value < options.min) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `${field} deve ser maior ou igual a ${options.min}.`,
      400,
    );
  }

  return value;
}

export function assertPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `${field} deve ser um número válido.`,
      400,
    );
  }

  if (value <= 0) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `${field} deve ser maior que zero.`,
      400,
    );
  }

  return value;
}

export function assertLast4Digits(value: unknown, required: boolean): string | null {
  if (value === null || value === undefined || value === "") {
    if (required) {
      throw new FinanceError(
        "VALIDATION_ERROR",
        "Os últimos 4 dígitos do cartão são obrigatórios.",
        400,
      );
    }
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Os últimos 4 dígitos devem conter exatamente 4 números.",
      400,
    );
  }

  return value;
}

export function assertDate(value: unknown, field: string): Date {
  if (typeof value !== "string") {
    throw new FinanceError("VALIDATION_ERROR", `${field} inválida.`, 400);
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new FinanceError("VALIDATION_ERROR", `${field} inválida.`, 400);
  }

  return date;
}

export function assertCategory(value: unknown): string {
  const category = assertNonEmptyString(value, "Categoria");

  if (!ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Categoria inválida.",
      400,
    );
  }

  return category;
}

export function toDbAccountType(value: ApiFinancialAccountType): FinancialAccountType {
  if (value === "credit") return FinancialAccountType.CREDIT;
  if (value === "debit") return FinancialAccountType.DEBIT;
  return FinancialAccountType.INVESTMENT;
}

export function fromDbAccountType(value: FinancialAccountType): ApiFinancialAccountType {
  if (value === FinancialAccountType.CREDIT) return "credit";
  if (value === FinancialAccountType.DEBIT) return "debit";
  return "investment";
}

export function toDbMarketProvider(value: ApiMarketProvider): MarketProvider {
  if (value === "coingecko") {
    return MarketProvider.COINGECKO;
  }

  return MarketProvider.COINGECKO;
}

export function fromDbMarketProvider(value: MarketProvider): ApiMarketProvider {
  if (value === MarketProvider.COINGECKO) {
    return "coingecko";
  }

  return "coingecko";
}

export function toDbKind(value: ApiTransactionKind): TransactionKind {
  return value === "income" ? TransactionKind.INCOME : TransactionKind.EXPENSE;
}

export function fromDbKind(value: TransactionKind): ApiTransactionKind {
  return value === TransactionKind.INCOME ? "income" : "expense";
}

export function toDbStatus(value: ApiTransactionStatus): TransactionStatus {
  if (value === "pago") return TransactionStatus.PAID;
  if (value === "pendente") return TransactionStatus.PENDING;
  return TransactionStatus.LATE;
}

export function fromDbStatus(value: TransactionStatus): ApiTransactionStatus {
  if (value === TransactionStatus.PAID) return "pago";
  if (value === TransactionStatus.PENDING) return "pendente";
  return "atrasado";
}

export function toDbFrequency(value: ApiTransactionFrequency): TransactionFrequency {
  return value === "recorrente"
    ? TransactionFrequency.RECURRING
    : TransactionFrequency.ONE_OFF;
}

export function fromDbFrequency(value: TransactionFrequency): ApiTransactionFrequency {
  return value === TransactionFrequency.RECURRING ? "recorrente" : "unica";
}

export function isSettledStatus(status: TransactionStatus): boolean {
  return status === TransactionStatus.PAID;
}
