import { NextResponse } from "next/server";
import { FinanceError, isFinanceError } from "@/src/server/finance/errors";

type PrismaLikeError = {
  code?: string;
  message?: string;
};

function isPrismaLikeError(error: unknown): error is PrismaLikeError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as PrismaLikeError;
  return typeof candidate.code === "string";
}

function isMissingPrismaObjectError(error: unknown): boolean {
  if (!isPrismaLikeError(error)) {
    return false;
  }

  return error.code === "P2021" || error.code === "P2022";
}

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

  if (isMissingPrismaObjectError(error)) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Banco de dados sem migracao aplicada. Execute prisma migrate deploy no ambiente.",
        },
      },
      { status: 503 },
    );
  }

  if (error instanceof SyntaxError) {
    return jsonValidationError("JSON invalido no corpo da requisicao.");
  }

  console.error("[finance-api]", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno ao processar a operacao.",
      },
    },
    { status: 500 },
  );
}

export function assertObjectPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Payload invalido. Esperado um objeto JSON.",
      400,
    );
  }

  return value as Record<string, unknown>;
}
