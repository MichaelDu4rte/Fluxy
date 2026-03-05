import type { TelegramTransactionCreatedRealtimePayload } from "@/src/lib/realtime/types";

const REALTIME_PUBLISH_TIMEOUT_MS = 1500;

function getRealtimeIngestEndpoint(): string | null {
  const baseUrl = process.env.REALTIME_EVENTS_INGEST_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/internal/events/telegram-transaction-created`;
}

function isPayloadValid(payload: TelegramTransactionCreatedRealtimePayload): boolean {
  return (
    payload.source === "telegram"
    && payload.userId.trim().length > 0
    && payload.transactionId.trim().length > 0
    && payload.accountId.trim().length > 0
    && payload.merchant.trim().length > 0
    && Number.isFinite(payload.amountCents)
    && payload.occurredAt.trim().length > 0
    && payload.createdAt.trim().length > 0
  );
}

export async function publishTelegramTransactionCreatedEvent(
  payload: TelegramTransactionCreatedRealtimePayload,
): Promise<void> {
  const endpoint = getRealtimeIngestEndpoint();
  const secret = process.env.REALTIME_EVENTS_SECRET?.trim();

  if (!endpoint || !secret) {
    return;
  }

  if (!isPayloadValid(payload)) {
    console.warn("[realtime] invalid telegram realtime payload; skipping publish", {
      transactionId: payload.transactionId,
      userId: payload.userId,
    });
    return;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, REALTIME_PUBLISH_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-realtime-secret": secret,
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn("[realtime] failed to publish telegram event", {
        status: response.status,
        endpoint,
        body,
        transactionId: payload.transactionId,
        userId: payload.userId,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("[realtime] telegram publish request failed", {
      endpoint,
      message,
      transactionId: payload.transactionId,
      userId: payload.userId,
    });
  } finally {
    clearTimeout(timeout);
  }
}

