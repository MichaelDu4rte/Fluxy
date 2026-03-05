import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRealtimeSocketToken,
  getRealtimeSocketUrl,
} from "@/src/server/realtime/socket-token";
import type { RealtimeSocketTokenResponse } from "@/src/lib/realtime/types";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    const socketUrl = getRealtimeSocketUrl();
    const { token, expiresAt } = await createRealtimeSocketToken(session.user.id);

    const body: RealtimeSocketTokenResponse = {
      token,
      socketUrl,
      expiresAt,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue socket token";
    return NextResponse.json(
      { error: { message } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

