import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import { handleFinanceHttpError } from "@/src/server/finance/http";
import { getBatchQuotes } from "@/src/server/finance/market-service";

export async function GET(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/market/crypto/quotes",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
    const ids = idsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const quotes = await getBatchQuotes(ids);
    return NextResponse.json({ quotes });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

