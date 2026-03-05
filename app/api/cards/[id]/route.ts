import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import {
  deleteCardForUser,
  updateCardForUser,
} from "@/src/server/finance/cards-service";
import { assertObjectPayload, handleFinanceHttpError } from "@/src/server/finance/http";
import { invalidateFinanceCacheForUser } from "@/src/server/finance/read-cache";
import type { UpdateCardInput } from "@/src/server/finance/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/cards",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const { id } = await context.params;
    const payload = assertObjectPayload(await request.json());

    const investmentPayload =
      payload.investment === null
        ? null
        : payload.investment
        && typeof payload.investment === "object"
        && !Array.isArray(payload.investment)
        ? (payload.investment as Record<string, unknown>)
        : undefined;

    const input: UpdateCardInput = {
      name: typeof payload.name === "string" ? payload.name : undefined,
      type:
        payload.type === "credit" || payload.type === "debit" || payload.type === "investment"
          ? payload.type
          : undefined,
      isActive: typeof payload.isActive === "boolean" ? payload.isActive : undefined,
      investment:
        investmentPayload === null
          ? null
          : investmentPayload
          ? {
            provider: "coingecko",
            assetId: String(investmentPayload.assetId ?? ""),
            assetSymbol: String(investmentPayload.assetSymbol ?? ""),
            assetName: String(investmentPayload.assetName ?? ""),
            entryPriceBrl:
              typeof investmentPayload.entryPriceBrl === "number"
                ? investmentPayload.entryPriceBrl
                : Number.NaN,
          }
          : undefined,
      last4Digits:
        typeof payload.last4Digits === "string" ? payload.last4Digits : undefined,
      creditLimitCents:
        typeof payload.creditLimitCents === "number"
          ? payload.creditLimitCents
          : undefined,
      initialBalanceCents:
        typeof payload.initialBalanceCents === "number"
          ? payload.initialBalanceCents
          : undefined,
      adjustmentSourceAccountId:
        typeof payload.adjustmentSourceAccountId === "string"
          ? payload.adjustmentSourceAccountId
          : payload.adjustmentSourceAccountId === null
          ? null
          : undefined,
      adjustmentDestinationAccountId:
        typeof payload.adjustmentDestinationAccountId === "string"
          ? payload.adjustmentDestinationAccountId
          : payload.adjustmentDestinationAccountId === null
          ? null
          : undefined,
    };

    const item = await updateCardForUser(userOrRedirect.id, id, input);
    invalidateFinanceCacheForUser(userOrRedirect.id);
    return NextResponse.json({ item });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/cards",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const { id } = await context.params;
    const result = await deleteCardForUser(userOrRedirect.id, id);
    invalidateFinanceCacheForUser(userOrRedirect.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}
