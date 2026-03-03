import { NextResponse } from "next/server";
import { FinanceError, isFinanceError } from "@/src/server/finance/errors";

export function jsonValidationError(message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message,
        details,
      },
    },
    { status: 400 },
  );
}

export function handleFinanceHttpError(error: unknown): NextResponse {
  if (isFinanceError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof SyntaxError) {
    return jsonValidationError("JSON inválido no corpo da requisição.");
  }

  console.error("[finance-api]", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno ao processar a operação.",
      },
    },
    { status: 500 },
  );
}

export function assertObjectPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Payload inválido. Esperado um objeto JSON.",
      400,
    );
  }

  return value as Record<string, unknown>;
}
