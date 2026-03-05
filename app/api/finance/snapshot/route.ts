import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import { handleFinanceHttpError } from "@/src/server/finance/http";
import {
  getCachedCardsForUser,
  getCachedTransactionsForUser,
} from "@/src/server/finance/read-cache";
import type { FinanceSnapshotDto } from "@/src/server/finance/types";

export async function GET(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/finance/snapshot",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const [cards, transactionsResult] = await Promise.all([
      getCachedCardsForUser(userOrRedirect.id, "all"),
      getCachedTransactionsForUser(userOrRedirect.id, {}),
    ]);

    const snapshot: FinanceSnapshotDto = {
      cards,
      transactions: transactionsResult.items,
      summary: transactionsResult.summary,
    };

    return NextResponse.json(snapshot);
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}
