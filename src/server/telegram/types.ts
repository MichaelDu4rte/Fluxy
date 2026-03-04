import type { ApiTransactionStatus } from "@/src/server/finance/types";

export type TelegramExpenseCategory =
  | "moradia"
  | "alimentacao"
  | "transporte"
  | "assinaturas"
  | "lazer"
  | "saude"
  | "educacao"
  | "outros";

export type ParsedTelegramExpenseMessage = {
  merchant: string;
  description: string;
  amountCents: number;
  accountName: string;
  category: TelegramExpenseCategory;
  status: ApiTransactionStatus;
  occurredAt: string;
};

export type TelegramWebhookChat = {
  id: number | string;
  type: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramWebhookMessage = {
  message_id: number;
  text?: string;
  chat: TelegramWebhookChat;
};

export type TelegramWebhookUpdate = {
  update_id: number | string;
  message?: TelegramWebhookMessage;
};

export type TelegramLinkStatusDto = {
  linked: boolean;
  link: {
    chatId: string;
    chatType: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    linkedAt: string;
    lastSeenAt: string;
  } | null;
  activeCode: {
    code: string;
    expiresAt: string;
    expiresInSeconds: number;
  } | null;
  botUsername: string | null;
  formatExample: string;
};

export type GenerateTelegramLinkCodeResponseDto = {
  code: string;
  expiresAt: string;
  expiresInSeconds: number;
};

export type TelegramWebhookProcessResult =
  | "ignored"
  | "duplicate"
  | "linked"
  | "created"
  | "invalid";
