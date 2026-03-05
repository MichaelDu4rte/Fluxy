import { FinanceError } from "@/src/server/finance/errors";
import { ALLOWED_CATEGORIES } from "@/src/server/finance/validators";
import type { ApiTransactionStatus } from "@/src/server/finance/types";
import type { ParsedTelegramExpenseMessage, TelegramExpenseCategory } from "@/src/server/telegram/types";

const VALID_STATUSES = new Set<ApiTransactionStatus>(["pago", "pendente", "atrasado"]);
const VALID_CATEGORIES = new Set<string>(ALLOWED_CATEGORIES);
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DEFAULT_CATEGORY: TelegramExpenseCategory = "outros";
const DEFAULT_STATUS: ApiTransactionStatus = "pago";
const DATE_TIMEZONE = "America/Sao_Paulo";
const FORMAT_HINT =
  "Formato invalido. Use: titulo, descricao, valor, cartao[, categoria[, status[, data]]].";

type PayloadParts = {
  merchant: string;
  description: string;
  amountRaw: string;
  accountName: string;
  optional: string[];
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildIsoDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || month < 1
    || month > 12
    || day < 1
    || day > 31
  ) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

function tryParseDateToIso(valueRaw: string): string | null {
  const value = valueRaw.trim();
  const isoMatch = value.match(ISO_DATE_RE);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const iso = buildIsoDate(year, month, day);
    if (iso) {
      return iso;
    }
  }

  const brMatch = value.match(BR_DATE_RE);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const iso = buildIsoDate(year, month, day);
    if (iso) {
      return iso;
    }
  }

  return null;
}

function parseDateToIso(valueRaw: string): string {
  const iso = tryParseDateToIso(valueRaw);
  if (iso) {
    return iso;
  }

  throw new FinanceError(
    "VALIDATION_ERROR",
    "Data invalida. Use DD/MM/AAAA (ex.: 05/03/2026) ou YYYY-MM-DD.",
    400,
  );
}

function getTodayIsoInSaoPaulo(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DATE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new FinanceError("VALIDATION_ERROR", "Nao foi possivel resolver a data atual.", 500);
  }

  return `${year}-${month}-${day}`;
}

function normalizeCategory(value: string): TelegramExpenseCategory {
  const category = value.trim().toLowerCase();
  const normalized = category === "outro" ? "outros" : category;

  if (!VALID_CATEGORIES.has(normalized)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      `Categoria invalida. Use: ${ALLOWED_CATEGORIES.join(", ")}`,
      400,
    );
  }

  return normalized as TelegramExpenseCategory;
}

function parseStatus(value: string): ApiTransactionStatus {
  const status = value.trim().toLowerCase() as ApiTransactionStatus;
  if (!VALID_STATUSES.has(status)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Status invalido. Use: pago, pendente ou atrasado.",
      400,
    );
  }
  return status;
}

function isStatusToken(value: string): boolean {
  return VALID_STATUSES.has(value.trim().toLowerCase() as ApiTransactionStatus);
}

function isDateToken(value: string): boolean {
  return Boolean(tryParseDateToIso(value));
}

function isLikelyCommaCents(rawParts: string[]): boolean {
  if (rawParts.length < 5) {
    return false;
  }

  const whole = rawParts[2]?.trim();
  const cents = rawParts[3]?.trim();

  return /^[\d.]+$/.test(whole) && /^\d{2}$/.test(cents);
}

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

function buildCandidateFromRaw(
  rawParts: string[],
  mergeAmountParts: boolean,
): PayloadParts | null {
  if (!mergeAmountParts) {
    if (rawParts.length < 4 || rawParts.length > 7) {
      return null;
    }

    return {
      merchant: rawParts[0],
      description: rawParts[1],
      amountRaw: rawParts[2],
      accountName: rawParts[3],
      optional: rawParts.slice(4),
    };
  }

  if (rawParts.length < 5 || rawParts.length > 8) {
    return null;
  }

  const amountRaw = `${rawParts[2]},${rawParts[3]}`;
  const accountName = rawParts[4];
  const optional = rawParts.slice(5);
  if (optional.length > 3) {
    return null;
  }

  return {
    merchant: rawParts[0],
    description: rawParts[1],
    amountRaw,
    accountName,
    optional,
  };
}

function splitPayload(rawText: string): PayloadParts[] {
  const text = rawText.trim();
  if (!text) {
    throw new FinanceError("VALIDATION_ERROR", "Mensagem vazia.", 400);
  }

  const rawParts = text.split(",").map((part) => part.trim());
  const candidateOrder = isLikelyCommaCents(rawParts)
    ? [true, false]
    : [false, true];
  const candidates: PayloadParts[] = [];

  for (const mergeAmountParts of candidateOrder) {
    const candidate = buildCandidateFromRaw(rawParts, mergeAmountParts);
    if (candidate && !candidates.some((existing) =>
      existing.merchant === candidate.merchant
      && existing.description === candidate.description
      && existing.amountRaw === candidate.amountRaw
      && existing.accountName === candidate.accountName
      && existing.optional.join("|") === candidate.optional.join("|")
    )) {
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    throw new FinanceError("VALIDATION_ERROR", FORMAT_HINT, 400);
  }

  return candidates;
}

function parsePayload(payload: PayloadParts): ParsedTelegramExpenseMessage {
  const merchant = payload.merchant?.trim();
  const description = payload.description?.trim();
  const amountRaw = payload.amountRaw?.trim();
  const accountName = payload.accountName?.trim();

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

  if (payload.optional.length > 3) {
    throw new FinanceError("VALIDATION_ERROR", FORMAT_HINT, 400);
  }

  if (payload.optional.some((part) => part.trim() === "")) {
    throw new FinanceError("VALIDATION_ERROR", FORMAT_HINT, 400);
  }

  if (payload.optional[0] && (isStatusToken(payload.optional[0]) || isDateToken(payload.optional[0]))) {
    throw new FinanceError("VALIDATION_ERROR", FORMAT_HINT, 400);
  }

  if (payload.optional[1] && isDateToken(payload.optional[1])) {
    throw new FinanceError("VALIDATION_ERROR", FORMAT_HINT, 400);
  }

  const category = payload.optional[0]
    ? normalizeCategory(payload.optional[0])
    : DEFAULT_CATEGORY;
  const status = payload.optional[1]
    ? parseStatus(payload.optional[1])
    : DEFAULT_STATUS;
  const occurredAt = payload.optional[2]
    ? parseDateToIso(payload.optional[2])
    : getTodayIsoInSaoPaulo();

  return {
    merchant,
    description,
    amountCents: parseMoneyToCents(amountRaw),
    accountName,
    category,
    status,
    occurredAt,
  };
}

export function parseTelegramExpenseMessage(text: string): ParsedTelegramExpenseMessage {
  const candidates = splitPayload(text);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return parsePayload(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof FinanceError) {
    throw lastError;
  }

  throw new FinanceError("VALIDATION_ERROR", FORMAT_HINT, 400);
}
