import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import {
  createTransactionsForUser,
} from "@/src/server/finance/transactions-service";
import { assertObjectPayload, handleFinanceHttpError } from "@/src/server/finance/http";
import {
  getCachedTransactionsForUser,
  invalidateFinanceCacheForUser,
} from "@/src/server/finance/read-cache";
import type {
  CreateTransactionInput,
  TransactionsFilters,
} from "@/src/server/finance/types";

function parseFilters(searchParams: URLSearchParams): TransactionsFilters {
  return {
    search: searchParams.get("search") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    accountId: searchParams.get("accountId") ?? undefined,
    status: (searchParams.get("status") as TransactionsFilters["status"]) ?? undefined,
    frequency:
      (searchParams.get("frequency") as TransactionsFilters["frequency"]) ?? undefined,
    kindMode:
      (searchParams.get("kindMode") as TransactionsFilters["kindMode"]) ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/transactions",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const { items, summary } = await getCachedTransactionsForUser(
      userOrRedirect.id,
      parseFilters(request.nextUrl.searchParams),
    );

    return NextResponse.json({ items, summary });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/transactions",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const payload = assertObjectPayload(await request.json());

    const input: CreateTransactionInput = {
      accountId: String(payload.accountId ?? ""),
      kind: (payload.kind as CreateTransactionInput["kind"]) ?? "expense",
      status: (payload.status as CreateTransactionInput["status"]) ?? "pendente",
      frequency: (payload.frequency as CreateTransactionInput["frequency"]) ?? "unica",
      category: String(payload.category ?? ""),
      merchant: String(payload.merchant ?? ""),
      description:
        typeof payload.description === "string" ? payload.description : undefined,
      amountCents: Number(payload.amountCents ?? 0),
      occurredAt: String(payload.occurredAt ?? ""),
      isInstallment: Boolean(payload.isInstallment),
      installmentTotal: Number(payload.installmentTotal ?? 1),
      isRecurring: Boolean(payload.isRecurring),
    };

    const result = await createTransactionsForUser(userOrRedirect.id, input);
    invalidateFinanceCacheForUser(userOrRedirect.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}
