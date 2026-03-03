import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import { handleFinanceHttpError } from "@/src/server/finance/http";
import { searchAssets } from "@/src/server/finance/market-service";

export async function GET(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/market/crypto/assets",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const query = request.nextUrl.searchParams.get("q") ?? "";
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "12");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 12;

    const items = await searchAssets(query, limit);
    return NextResponse.json({ items });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

