import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import { handleFinanceHttpError } from "@/src/server/finance/http";
import { generateTelegramLinkCode } from "@/src/server/telegram/service";

export async function POST(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/integracoes/telegram/link-code",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const result = await generateTelegramLinkCode(userOrRedirect.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}
