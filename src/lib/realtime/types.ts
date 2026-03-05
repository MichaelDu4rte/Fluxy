export const TELEGRAM_REALTIME_EVENT_NAME = "finance:telegram_transaction_created" as const;

export type TelegramTransactionCreatedRealtimePayload = {
  source: "telegram";
  userId: string;
  transactionId: string;
  accountId: string;
  merchant: string;
  amountCents: number;
  occurredAt: string;
  createdAt: string;
};

export type RealtimeSocketTokenResponse = {
  token: string;
  socketUrl: string;
  expiresAt: string;
};

