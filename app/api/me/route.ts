import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/src/lib/auth-guards";

export async function GET(request: NextRequest) {
  const userOrRedirect = await requireUserFromRequest(request);

  if (userOrRedirect instanceof NextResponse) {
    return userOrRedirect;
  }

  return NextResponse.json({ user: userOrRedirect });
}

