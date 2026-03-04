import { FinanceError } from "@/src/server/finance/errors";
import { ALLOWED_CATEGORIES } from "@/src/server/finance/validators";
import type { ApiTransactionStatus } from "@/src/server/finance/types";
import type { ParsedTelegramExpenseMessage, TelegramExpenseCategory } from "@/src/server/telegram/types";

const VALID_STATUSES = new Set<ApiTransactionStatus>(["pago", "pendente", "atrasado"]);
const VALID_CATEGORIES = new Set<string>(ALLOWED_CATEGORIES);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseMoneyToCents(valueRaw: string): number {
  const trimmed = valueRaw.trim();
  if (!trimmed) {
    throw new FinanceError("VALIDATION_ERROR", "Valor obrigatorio no campo 3.", 400);
  }

  let normalized = trimmed
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");

    if (lastComma > lastDot) {
      // 1.234,56
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    // 123,45
    normalized = normalized.replace(",", ".");
  }

  normalized = normalized.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Valor invalido. Use numero positivo, ex.: 8,00",
      400,
    );
  }

  return Math.round(parsed * 100);
}

function splitPayload(rawText: string): string[] {
  const text = rawText.trim();
  if (!text) {
    throw new FinanceError("VALIDATION_ERROR", "Mensagem vazia.", 400);
  }

  const rawParts = text.split(",").map((part) => part.trim());
  if (rawParts.length === 7) {
    return rawParts;
  }

  if (rawParts.length === 8) {
    // Suporte para valor decimal com virgula sem aspas: "8,00"
    return [
      rawParts[0],
      rawParts[1],
      `${rawParts[2]},${rawParts[3]}`,
      rawParts[4],
      rawParts[5],
      rawParts[6],
      rawParts[7],
    ];
  }

  throw new FinanceError(
    "VALIDATION_ERROR",
    "Formato invalido. Use: titulo, descricao, valor, cartao, categoria, status, data",
    400,
  );
}

export function parseTelegramExpenseMessage(text: string): ParsedTelegramExpenseMessage {
  const parts = splitPayload(text);

  const merchant = parts[0]?.trim();
  const description = parts[1]?.trim();
  const amountRaw = parts[2]?.trim();
  const accountName = parts[3]?.trim();
  const categoryRaw = parts[4]?.trim().toLowerCase();
  const statusRaw = parts[5]?.trim().toLowerCase() as ApiTransactionStatus;
  const occurredAt = parts[6]?.trim();

  if (!merchant) {
    throw new FinanceError("VALIDATION_ERROR", "Titulo obrigatorio no campo 1.", 400);
  }

  if (!description) {
    throw new FinanceError("VALIDATION_ERROR", "Descricao obrigatoria no campo 2.", 400);
  }

  if (!amountRaw) {
    throw new FinanceError("VALIDATION_ERROR", "Valor obrigatorio no campo 3.", 400);
  }

  if (!accountName) {
    throw new FinanceError("VALIDATION_ERROR", "Cartao/conta obrigatorio no campo 4.", 400);
  }

  if (!categoryRaw || !VALID_CATEGORIES.has(categoryRaw)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `Categoria invalida. Use: ${ALLOWED_CATEGORIES.join(", ")}`,
      400,
    );
  }

  if (!VALID_STATUSES.has(statusRaw)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Status invalido. Use: pago, pendente ou atrasado.",
      400,
    );
  }

  if (!occurredAt || !ISO_DATE_RE.test(occurredAt)) {
    throw new FinanceError("VALIDATION_ERROR", "Data invalida. Use YYYY-MM-DD.", 400);
  }

  const parsedDate = new Date(`${occurredAt}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new FinanceError("VALIDATION_ERROR", "Data invalida. Use YYYY-MM-DD.", 400);
  }

  return {
    merchant,
    description,
    amountCents: parseMoneyToCents(amountRaw),
    accountName,
    category: categoryRaw as TelegramExpenseCategory,
    status: statusRaw,
    occurredAt,
  };
}
