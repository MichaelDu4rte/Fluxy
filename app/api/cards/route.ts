import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import {
  createCardForUser,
  listCardsForUser,
} from "@/src/server/finance/cards-service";
import { handleFinanceHttpError, assertObjectPayload } from "@/src/server/finance/http";
import type { CreateCardInput } from "@/src/server/finance/types";

export async function GET(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/cards",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const statusParam = request.nextUrl.searchParams.get("status");
    const statusFilter =
      statusParam === "inactive" || statusParam === "all"
        ? statusParam
        : "active";

    const items = await listCardsForUser(userOrRedirect.id, statusFilter);
    return NextResponse.json({ items });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/cards",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const payload = assertObjectPayload(await request.json());

    const investmentPayload =
      payload.investment && typeof payload.investment === "object" && !Array.isArray(payload.investment)
        ? (payload.investment as Record<string, unknown>)
        : null;

    const input: CreateCardInput = {
      name: String(payload.name ?? ""),
      type: (payload.type as CreateCardInput["type"]) ?? "investment",
      investment: investmentPayload
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
        : null,
      last4Digits:
        typeof payload.last4Digits === "string" ? payload.last4Digits : null,
      creditLimitCents:
        typeof payload.creditLimitCents === "number"
          ? payload.creditLimitCents
          : null,
      fundingSourceAccountId:
        typeof payload.fundingSourceAccountId === "string"
          ? payload.fundingSourceAccountId
          : null,
      initialBalanceCents:
        typeof payload.initialBalanceCents === "number"
          ? payload.initialBalanceCents
          : 0,
    };

    const item = await createCardForUser(userOrRedirect.id, input);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}
