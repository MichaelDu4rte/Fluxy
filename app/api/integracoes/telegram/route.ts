import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";
import { handleFinanceHttpError } from "@/src/server/finance/http";
import {
  getTelegramLinkStatus,
  unlinkTelegramChat,
} from "@/src/server/telegram/service";

export async function GET(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/integracoes/telegram",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    const status = await getTelegramLinkStatus(userOrRedirect.id);
    return NextResponse.json(status);
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userOrRedirect = await requireUserFromRequest(request, {
      currentPath: "/api/integracoes/telegram",
    });

    if (userOrRedirect instanceof NextResponse) {
      return userOrRedirect;
    }

    await unlinkTelegramChat(userOrRedirect.id);
    const status = await getTelegramLinkStatus(userOrRedirect.id);

    return NextResponse.json(status);
  } catch (error) {
    return handleFinanceHttpError(error);
  }
}
