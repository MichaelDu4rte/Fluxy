import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import { handleFinanceHttpError } from "@/src/server/finance/http";
import { getAssetInsight } from "@/src/server/finance/market-service";

export async function GET(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/market/crypto/insight",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const assetId = request.nextUrl.searchParams.get("assetId") ?? "";
    const amountRaw = Number(request.nextUrl.searchParams.get("amountCents") ?? "0");
    const amountCents = Number.isFinite(amountRaw) ? Math.trunc(amountRaw) : 0;

    const insight = await getAssetInsight(assetId, amountCents);
    return NextResponse.json({ insight });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

