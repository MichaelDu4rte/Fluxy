"use client";

import { io } from "socket.io-client";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  TELEGRAM_REALTIME_EVENT_NAME,
  type RealtimeSocketTokenResponse,
} from "@/src/lib/realtime/types";

const REFRESH_DEBOUNCE_MS = 400;
const DEFAULT_TOAST_MESSAGE = "Nova despesa via Telegram";

type UseTelegramRealtimeRefreshOptions = {
  onRefresh: () => Promise<void> | void;
  toastMessage?: string;
  enabled?: boolean;
};

async function fetchSocketToken(): Promise<RealtimeSocketTokenResponse | null> {
  const response = await fetch("/api/realtime/socket-token", {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as RealtimeSocketTokenResponse;
  if (!data?.token || !data?.socketUrl) {
    return null;
  }

  return data;
}

export function useTelegramRealtimeRefresh({
  onRefresh,
  toastMessage = DEFAULT_TOAST_MESSAGE,
  enabled = true,
}: UseTelegramRealtimeRefreshOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const configuredSocketUrl = process.env.NEXT_PUBLIC_REALTIME_SOCKET_URL?.trim();
    if (!configuredSocketUrl) {
      return;
    }

    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshing = false;
    let queuedRefresh = false;
    let socketClient: ReturnType<typeof io> | null = null;

    const runRefresh = async () => {
      if (disposed || refreshing) {
        queuedRefresh = true;
        return;
      }

      refreshing = true;
      try {
        await onRefresh();
        toast.success(toastMessage);
      } catch (error) {
        console.warn("[realtime] refresh callback failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        refreshing = false;
        if (queuedRefresh && !disposed) {
          queuedRefresh = false;
          void runRefresh();
        }
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) {
        return;
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void runRefresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    void (async () => {
      try {
        const tokenResponse = await fetchSocketToken();
        if (disposed || !tokenResponse) {
          return;
        }

        socketClient = io(tokenResponse.socketUrl, {
          transports: ["websocket"],
          auth: {
            token: tokenResponse.token,
          },
        });

        socketClient.on(
          TELEGRAM_REALTIME_EVENT_NAME,
          () => {
            scheduleRefresh();
          },
        );

        socketClient.on("connect_error", (error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.warn("[realtime] socket connect_error", { message });
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn("[realtime] failed to initialize realtime socket", { message });
      }
    })();

    return () => {
      disposed = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      if (socketClient) {
        socketClient.disconnect();
      }
    };
  }, [enabled, onRefresh, toastMessage]);
}
