export type FinanceErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INSUFFICIENT_AVAILABLE_BALANCE"
  | "MARKET_DATA_UNAVAILABLE"
  | "UNAUTHORIZED";

export class FinanceError extends Error {
  public readonly status: number;
  public readonly code: FinanceErrorCode;
  public readonly details?: unknown;

  constructor(
    code: FinanceErrorCode,
    message: string,
    status = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "FinanceError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isFinanceError(error: unknown): error is FinanceError {
  return error instanceof FinanceError;
}
