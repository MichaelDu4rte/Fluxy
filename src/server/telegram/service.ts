import { prisma } from "@/lib/prisma";
import { FinanceError } from "@/src/server/finance/errors";
import { createTransactionsForUser } from "@/src/server/finance/transactions-service";
import { parseTelegramExpenseMessage } from "@/src/server/telegram/parser";
import type {
  GenerateTelegramLinkCodeResponseDto,
  TelegramLinkStatusDto,
  TelegramWebhookChat,
  TelegramWebhookProcessResult,
  TelegramWebhookUpdate,
} from "@/src/server/telegram/types";

const LINK_CODE_TTL_SECONDS = 10 * 60;
const LINK_CODE_SIZE = 8;
const LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TELEGRAM_FORMAT_EXAMPLE =
  "Mercado, Coca, 8,00, Cartao, alimentacao, pago, 2026-03-04";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function createLinkCode(): string {
  return Array.from({ length: LINK_CODE_SIZE }, () => {
    const idx = Math.floor(Math.random() * LINK_CODE_ALPHABET.length);
    return LINK_CODE_ALPHABET[idx];
  }).join("");
}

function normalizeLinkCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function isUniqueConstraintViolation(error: unknown): boolean {
  const maybe = error as { code?: string } | null;
  return Boolean(maybe && maybe.code === "P2002");
}

function toChatIdBigInt(chatId: number | string): bigint {
  try {
    return BigInt(String(chatId));
  } catch {
    throw new FinanceError("VALIDATION_ERROR", "Chat invalido para vinculacao.", 400);
  }
}

function getTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "TELEGRAM_BOT_TOKEN nao configurado no servidor.",
      500,
    );
  }
  return token;
}

async function sendTelegramMessage(chatId: bigint, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN ausente; mensagem nao enviada.");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[telegram] falha ao enviar mensagem", {
        status: response.status,
        body,
      });
    }
  } catch (error) {
    console.error("[telegram] erro ao enviar mensagem", error);
  }
}

function getTelegramErrorMessage(error: unknown): string {
  if (error instanceof FinanceError) {
    return error.message;
  }
  return "Nao foi possivel processar sua mensagem agora.";
}

function parseLinkCommand(text: string): { code: string } | null {
  const match = text
    .trim()
    .match(/^\/vincular(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9-]{4,32})$/i);

  if (!match) {
    return null;
  }

  return { code: normalizeLinkCode(match[1]) };
}

async function registerUpdateLog(updateId: bigint, chatId: bigint | null): Promise<boolean> {
  try {
    await prisma.telegramUpdateLog.create({
      data: {
        updateId,
        chatId,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return false;
    }
    throw error;
  }
}

export async function generateTelegramLinkCode(
  userId: string,
): Promise<GenerateTelegramLinkCodeResponseDto> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LINK_CODE_TTL_SECONDS * 1000);

  await prisma.telegramLinkCode.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: now,
    },
  });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = createLinkCode();

    try {
      await prisma.telegramLinkCode.create({
        data: {
          userId,
          code: candidate,
          expiresAt,
        },
      });

      return {
        code: candidate,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: LINK_CODE_TTL_SECONDS,
      };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new FinanceError(
    "VALIDATION_ERROR",
    "Nao foi possivel gerar codigo de vinculacao. Tente novamente.",
    500,
  );
}

export async function getTelegramLinkStatus(userId: string): Promise<TelegramLinkStatusDto> {
  const now = new Date();
  const [link, activeCode] = await Promise.all([
    prisma.telegramLink.findUnique({
      where: { userId },
    }),
    prisma.telegramLinkCode.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    linked: Boolean(link?.isActive),
    link: link && link.isActive
      ? {
        chatId: link.chatId.toString(),
        chatType: link.chatType,
        username: link.username,
        firstName: link.firstName,
        lastName: link.lastName,
        linkedAt: link.linkedAt.toISOString(),
        lastSeenAt: link.lastSeenAt.toISOString(),
      }
      : null,
    activeCode: activeCode
      ? {
        code: activeCode.code,
        expiresAt: activeCode.expiresAt.toISOString(),
        expiresInSeconds: Math.max(
          0,
          Math.floor((activeCode.expiresAt.getTime() - now.getTime()) / 1000),
        ),
      }
      : null,
    botUsername: process.env.TELEGRAM_BOT_USERNAME?.trim() || null,
    formatExample: TELEGRAM_FORMAT_EXAMPLE,
  };
}

export async function unlinkTelegramChat(userId: string): Promise<void> {
  const now = new Date();

  await prisma.$transaction([
    prisma.telegramLink.deleteMany({
      where: { userId },
    }),
    prisma.telegramLinkCode.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    }),
  ]);
}

export async function linkTelegramChatByCode(
  chatInfo: TelegramWebhookChat,
  rawCode: string,
): Promise<{ userId: string }> {
  if (chatInfo.type !== "private") {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "Vinculacao permitida apenas em conversa privada com o bot.",
      400,
    );
  }

  const code = normalizeLinkCode(rawCode);
  if (!code) {
    throw new FinanceError("VALIDATION_ERROR", "Codigo de vinculacao obrigatorio.", 400);
  }

  const now = new Date();
  const chatId = toChatIdBigInt(chatInfo.id);

  const result = await prisma.$transaction(async (tx) => {
    const linkCode = await tx.telegramLinkCode.findFirst({
      where: {
        code,
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!linkCode) {
      throw new FinanceError(
        "VALIDATION_ERROR",
        "Codigo invalido, expirado ou ja utilizado.",
        400,
      );
    }

    const existingByChat = await tx.telegramLink.findUnique({
      where: { chatId },
      select: { userId: true, isActive: true },
    });

    if (existingByChat && existingByChat.userId !== linkCode.userId && existingByChat.isActive) {
      throw new FinanceError(
        "VALIDATION_ERROR",
        "Este chat ja esta vinculado a outro usuario.",
        409,
      );
    }

    await tx.telegramLink.upsert({
      where: { userId: linkCode.userId },
      update: {
        chatId,
        chatType: chatInfo.type,
        username: chatInfo.username ?? null,
        firstName: chatInfo.first_name ?? null,
        lastName: chatInfo.last_name ?? null,
        isActive: true,
        linkedAt: now,
        lastSeenAt: now,
      },
      create: {
        userId: linkCode.userId,
        chatId,
        chatType: chatInfo.type,
        username: chatInfo.username ?? null,
        firstName: chatInfo.first_name ?? null,
        lastName: chatInfo.last_name ?? null,
        isActive: true,
        linkedAt: now,
        lastSeenAt: now,
      },
    });

    await tx.telegramLinkCode.update({
      where: { id: linkCode.id },
      data: { usedAt: now },
    });

    await tx.telegramLinkCode.updateMany({
      where: {
        userId: linkCode.userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    return { userId: linkCode.userId };
  });

  return result;
}

async function resolveLinkedUserByChat(chatId: bigint): Promise<{ userId: string } | null> {
  const link = await prisma.telegramLink.findUnique({
    where: { chatId },
    select: {
      userId: true,
      isActive: true,
    },
  });

  if (!link || !link.isActive) {
    return null;
  }

  return { userId: link.userId };
}

async function touchTelegramActivity(userId: string): Promise<void> {
  await prisma.telegramLink.updateMany({
    where: { userId, isActive: true },
    data: { lastSeenAt: new Date() },
  });
}

export async function handleTelegramWebhookUpdate(
  update: TelegramWebhookUpdate,
): Promise<TelegramWebhookProcessResult> {
  let updateId: bigint;

  try {
    updateId = BigInt(String(update.update_id));
  } catch {
    return "ignored";
  }

  const chatIdRaw = update.message?.chat?.id;
  let chatId: bigint | null = null;

  if (typeof chatIdRaw !== "undefined") {
    try {
      chatId = toChatIdBigInt(chatIdRaw);
    } catch {
      chatId = null;
    }
  }

  const inserted = await registerUpdateLog(updateId, chatId);
  if (!inserted) {
    return "duplicate";
  }

  const message = update.message;
  const text = message?.text?.trim();

  if (!message || !text) {
    return "ignored";
  }

  if (!chatId) {
    return "ignored";
  }

  if (message.chat.type !== "private") {
    await sendTelegramMessage(
      chatId,
      "Somente chat privado com o bot e permitido para esta integracao.",
    );
    return "invalid";
  }

  if (text.length > 500) {
    await sendTelegramMessage(chatId, "Mensagem muito longa. Envie no formato esperado.");
    return "invalid";
  }

  if (text.startsWith("/vincular")) {
    const command = parseLinkCommand(text);

    if (!command) {
      await sendTelegramMessage(chatId, "Use: /vincular CODIGO");
      return "invalid";
    }

    try {
      await linkTelegramChatByCode(message.chat, command.code);
      await sendTelegramMessage(
        chatId,
        "Vinculacao concluida. Agora envie despesas no formato: titulo, descricao, valor, cartao, categoria, status, data",
      );
      return "linked";
    } catch (error) {
      await sendTelegramMessage(chatId, getTelegramErrorMessage(error));
      return "invalid";
    }
  }

  const linkedUser = await resolveLinkedUserByChat(chatId);
  if (!linkedUser) {
    await sendTelegramMessage(
      chatId,
      "Chat nao vinculado. Gere um codigo no Fluxy e envie: /vincular CODIGO",
    );
    return "invalid";
  }

  try {
    const parsed = parseTelegramExpenseMessage(text);
    const account = await prisma.financialAccount.findFirst({
      where: {
        userId: linkedUser.userId,
        isActive: true,
        name: {
          equals: parsed.accountName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!account) {
      throw new FinanceError(
        "NOT_FOUND",
        `Cartao/conta "${parsed.accountName}" nao encontrado(a).`,
        404,
      );
    }

    await createTransactionsForUser(linkedUser.userId, {
      accountId: account.id,
      kind: "expense",
      status: parsed.status,
      frequency: "unica",
      category: parsed.category,
      merchant: parsed.merchant,
      description: parsed.description,
      amountCents: parsed.amountCents,
      occurredAt: parsed.occurredAt,
      isInstallment: false,
      installmentTotal: 1,
      isRecurring: false,
    });

    await touchTelegramActivity(linkedUser.userId);

    await sendTelegramMessage(
      chatId,
      `Despesa registrada: ${parsed.merchant} (${currencyFormatter.format(parsed.amountCents / 100)}) em ${parsed.occurredAt}.`,
    );

    return "created";
  } catch (error) {
    await sendTelegramMessage(
      chatId,
      `${getTelegramErrorMessage(error)}\nExemplo: ${TELEGRAM_FORMAT_EXAMPLE}`,
    );
    return "invalid";
  }
}

export async function validateTelegramRuntimeConfig(): Promise<void> {
  getTelegramBotToken();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new FinanceError(
      "VALIDATION_ERROR",
      "TELEGRAM_WEBHOOK_SECRET nao configurado no servidor.",
      500,
    );
  }
}
