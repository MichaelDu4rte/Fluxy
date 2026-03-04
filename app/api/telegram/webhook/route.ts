import { NextRequest, NextResponse } from "next/server";
import {
  handleTelegramWebhookUpdate,
  validateTelegramRuntimeConfig,
} from "@/src/server/telegram/service";
import type { TelegramWebhookUpdate } from "@/src/server/telegram/types";

function hasValidSecret(request: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const provided = request.headers.get("x-telegram-bot-api-secret-token")?.trim();

  if (!expected || !provided) {
    return false;
  }

  return expected === provided;
}

export async function POST(request: NextRequest) {
  try {
    await validateTelegramRuntimeConfig();
  } catch (error) {
    console.error("[telegram-webhook] runtime config invalida", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!hasValidSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    await handleTelegramWebhookUpdate(payload as TelegramWebhookUpdate);
  } catch (error) {
    console.error("[telegram-webhook] falha nao tratada", error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
