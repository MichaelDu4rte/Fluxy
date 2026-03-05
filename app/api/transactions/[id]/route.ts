import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import {
  deleteTransactionsForUser,
  updateTransactionsForUser,
} from "@/src/server/finance/transactions-service";
import { assertObjectPayload, handleFinanceHttpError } from "@/src/server/finance/http";
import { invalidateFinanceCacheForUser } from "@/src/server/finance/read-cache";
import type { ApiScope, UpdateTransactionInput } from "@/src/server/finance/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseScope(
  searchParams: URLSearchParams,
): ApiScope {
  const scope = searchParams.get("scope");
  return scope === "series" ? "series" : "item";
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/transactions",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const { id } = await context.params;
    const payload = assertObjectPayload(await request.json());
    const scope = parseScope(request.nextUrl.searchParams);

    const input: UpdateTransactionInput = {
      accountId: String(payload.accountId ?? ""),
      status: (payload.status as UpdateTransactionInput["status"]) ?? "pendente",
      category: String(payload.category ?? ""),
      merchant: String(payload.merchant ?? ""),
      description:
        typeof payload.description === "string" ? payload.description : undefined,
      amountCents: Number(payload.amountCents ?? 0),
      occurredAt: String(payload.occurredAt ?? ""),
    };

    const result = await updateTransactionsForUser(userOrRedirect.id, id, scope, input);
    invalidateFinanceCacheForUser(userOrRedirect.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/transactions",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const { id } = await context.params;
    const scope = parseScope(request.nextUrl.searchParams);
    const result = await deleteTransactionsForUser(userOrRedirect.id, id, scope);
    invalidateFinanceCacheForUser(userOrRedirect.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}
