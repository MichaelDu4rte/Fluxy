"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";
import type { FinanceSnapshotDto } from "@/src/server/finance/types";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

export const financeSnapshotQueryKey = ["finance", "snapshot"] as const;

async function fetchFinanceSnapshot(): Promise<FinanceSnapshotDto> {
  const response = await fetch("/api/finance/snapshot", {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const rawText = await response.text();
  const parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;

  if (!response.ok) {
    const apiError = (parsed ?? {}) as ApiErrorResponse;
    throw new Error(
      apiError.error?.message ?? "Nao foi possivel carregar o snapshot financeiro.",
    );
  }

  return parsed as FinanceSnapshotDto;
}

export function useFinanceSnapshotQuery() {
  return useQuery({
    queryKey: financeSnapshotQueryKey,
    queryFn: fetchFinanceSnapshot,
  });
}

export function invalidateFinanceSnapshotQuery(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: financeSnapshotQueryKey });
}
