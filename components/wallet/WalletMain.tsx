"use client";

import WalletCreateModal from "@/components/wallet/WalletCreateModal";
import WalletEditModal from "@/components/wallet/WalletEditModal";
import WalletHeaderBar from "@/components/wallet/WalletHeaderBar";
import WalletPerformanceTable from "@/components/wallet/WalletPerformanceTable";
import WalletPortfolioOverview from "@/components/wallet/WalletPortfolioOverview";
import WalletStrategicHoldings from "@/components/wallet/WalletStrategicHoldings";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, getTypeLabel } from "@/components/wallet/wallet-helpers";
import type {
  CardDto,
  CreateCardPayload,
  CryptoQuoteDto,
  TransactionDto,
  UpdateCardPayload,
  WalletHoldingVm,
  WalletPerformanceRowVm,
  WalletPortfolioSummaryVm,
  WalletSortMode,
} from "@/components/wallet/types";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

type AccountFlow = {
  inflowTotalCents: number;
  outflowTotalCents: number;
  inflowMonthCents: number;
  outflowMonthCents: number;
  settledOutflowMonthCents: number;
  currentNetMonthCents: number;
  previousNetMonthCents: number;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function toISODateLocal(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toISODateLocal(start), end: toISODateLocal(end) };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calculatePercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0;
    return current > 0 ? 100 : -100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function readApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const rawText = await response.text();
  const parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;

  if (!response.ok) {
    const apiError = (parsed ?? {}) as ApiErrorResponse;
    throw new ApiRequestError(
      apiError.error?.message ?? "Falha ao processar a requisição.",
      response.status,
      apiError.error?.code,
    );
  }

  return parsed as T;
}

export default function WalletMain() {
  const [cards, setCards] = useState<CardDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [marketQuotesByAssetId, setMarketQuotesByAssetId] = useState<Record<string, CryptoQuoteDto>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [sortMode, setSortMode] = useState<WalletSortMode>("allocation-desc");
  const [dateFrom, setDateFrom] = useState(() => getMonthRange(new Date()).start);
  const [dateTo, setDateTo] = useState(() => getMonthRange(new Date()).end);

  const [editingCard, setEditingCard] = useState<CardDto | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CardDto | null>(null);

  const refreshData = useCallback(async () => {
    const [cardsResponse, transactionsResponse] = await Promise.all([
      readApiJson<{ items: CardDto[] }>("/api/cards?status=all"),
      readApiJson<{ items: TransactionDto[] }>("/api/transactions"),
    ]);

    setCards(cardsResponse.items);
    setTransactions(transactionsResponse.items);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        await refreshData();
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message =
          error instanceof ApiRequestError
            ? error.message
            : "Não foi possível carregar a carteira.";
        toast.error(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [refreshData]);

  useEffect(() => {
    const investmentAssetIds = [...new Set(
      cards
        .filter((card) => card.type === "investment")
        .map((card) => card.investment?.assetId)
        .filter((assetId): assetId is string => Boolean(assetId)),
    )];

    if (investmentAssetIds.length === 0) {
      setMarketQuotesByAssetId({});
      return;
    }

    let mounted = true;

    const loadQuotes = async () => {
      try {
        const query = encodeURIComponent(investmentAssetIds.join(","));
        const response = await readApiJson<{ quotes: Record<string, CryptoQuoteDto> }>(
          `/api/market/crypto/quotes?ids=${query}`,
        );

        if (!mounted) {
          return;
        }

        setMarketQuotesByAssetId(response.quotes ?? {});
      } catch {
        if (!mounted) {
          return;
        }

        setMarketQuotesByAssetId({});
      }
    };

    void loadQuotes();

    return () => {
      mounted = false;
    };
  }, [cards]);

  const statusScopedCards = useMemo(() => {
    if (statusFilter === "all") {
      return cards;
    }

    return cards.filter((card) => (statusFilter === "active" ? card.isActive : !card.isActive));
  }, [cards, statusFilter]);

  const filteredCards = useMemo(() => {
    const term = normalizeText(searchValue.trim());
    if (!term) {
      return statusScopedCards;
    }

    return statusScopedCards.filter((card) => {
      const searchable = [
        card.name,
        card.last4Digits ?? "",
        card.type,
        getTypeLabel(card.type),
      ].join(" ");
      return normalizeText(searchable).includes(term);
    });
  }, [searchValue, statusScopedCards]);

  const filteredCardIds = useMemo(
    () => new Set(filteredCards.map((card) => card.id)),
    [filteredCards],
  );

  const filteredTransactions = useMemo(
    () => transactions.filter((tx) => filteredCardIds.has(tx.accountId)),
    [filteredCardIds, transactions],
  );

  const fundingSourceAccounts = useMemo(
    () => cards.filter((card) => card.isActive && card.type !== "investment"),
    [cards],
  );

  const { performanceRows, holdings, summary } = useMemo(() => {
    const now = new Date();
    const currentMonth = getMonthRange(now);
    const previousMonth = getMonthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const flowByAccount = new Map<string, AccountFlow>();
    for (const card of filteredCards) {
      flowByAccount.set(card.id, {
        inflowTotalCents: 0,
        outflowTotalCents: 0,
        inflowMonthCents: 0,
        outflowMonthCents: 0,
        settledOutflowMonthCents: 0,
        currentNetMonthCents: 0,
        previousNetMonthCents: 0,
      });
    }

    for (const tx of filteredTransactions) {
      const flow = flowByAccount.get(tx.accountId);
      if (!flow) {
        continue;
      }

      const amount = Math.max(0, tx.amountCents);
      const dateISO = tx.occurredAt.slice(0, 10);
      const isCurrentMonth = dateISO >= currentMonth.start && dateISO <= currentMonth.end;
      const isPreviousMonth = dateISO >= previousMonth.start && dateISO <= previousMonth.end;

      if (tx.kind === "income") {
        flow.inflowTotalCents += amount;
        if (isCurrentMonth) {
          flow.inflowMonthCents += amount;
          flow.currentNetMonthCents += amount;
        }
        if (isPreviousMonth) {
          flow.previousNetMonthCents += amount;
        }
      } else {
        flow.outflowTotalCents += amount;
        if (isCurrentMonth) {
          flow.outflowMonthCents += amount;
          flow.currentNetMonthCents -= amount;
          if (tx.status === "pago") {
            flow.settledOutflowMonthCents += amount;
          }
        }
        if (isPreviousMonth) {
          flow.previousNetMonthCents -= amount;
        }
      }
    }

    const totalAumCents = filteredCards.reduce(
      (acc, card) => acc + card.metrics.availableCents,
      0,
    );

    const enriched = filteredCards.map((card) => {
      const flow = flowByAccount.get(card.id);
      const monthlyLimitCents =
        card.type === "credit"
          ? Math.max(0, card.creditLimitCents ?? 0)
          : Math.max(0, card.initialBalanceCents);

      const utilizationPct =
        card.type === "credit" && (card.creditLimitCents ?? 0) > 0
          ? (card.metrics.creditUsedCents / Math.max(card.creditLimitCents ?? 1, 1)) * 100
          : (card.metrics.expenseTotalCents
            / Math.max(card.initialBalanceCents + card.metrics.incomeTotalCents, 1))
            * 100;

      const allocationPct = totalAumCents > 0
        ? (card.metrics.availableCents / totalAumCents) * 100
        : 0;

      const returnBase =
        card.type === "credit"
          ? Math.max(card.creditLimitCents ?? 0, 1)
          : Math.max(card.initialBalanceCents, 1);

      const fallbackReturnPct = flow
        ? ((flow.inflowMonthCents - flow.outflowMonthCents) / returnBase) * 100
        : 0;

      const investmentQuote = card.investment
        ? marketQuotesByAssetId[card.investment.assetId]
        : undefined;

      const marketReturnPct =
        card.type === "investment"
          && card.investment
          && typeof card.investment.entryPriceBrl === "number"
          && card.investment.entryPriceBrl > 0
          && investmentQuote
          ? ((investmentQuote.priceBrl - card.investment.entryPriceBrl) / card.investment.entryPriceBrl) * 100
          : null;

      const returnPct = typeof marketReturnPct === "number" ? marketReturnPct : fallbackReturnPct;

      return {
        card,
        monthlyLimitCents,
        utilizationPct,
        allocationPct,
        returnPct,
        investmentQuote,
      };
    });

    const sorted = [...enriched].sort((a, b) => {
      if (sortMode === "name-asc") {
        return a.card.name.localeCompare(b.card.name);
      }
      if (sortMode === "aum-desc") {
        return b.card.metrics.availableCents - a.card.metrics.availableCents;
      }
      if (sortMode === "return-desc") {
        return b.returnPct - a.returnPct;
      }
      return b.allocationPct - a.allocationPct;
    });

    const nextPerformanceRows: WalletPerformanceRowVm[] = sorted.map((item) => ({
      availableBalanceCents: Math.max(0, item.card.metrics.availableCents),
      spentCents: Math.max(0, item.card.metrics.expenseTotalCents),
      accountId: item.card.id,
      accountName: item.card.name,
      typeLabel: getTypeLabel(item.card.type),
      last4DigitsLabel: item.card.last4Digits ? `**** ${item.card.last4Digits}` : "",
      availableBalanceLabel: formatCurrency(Math.max(0, item.card.metrics.availableCents)),
      spentLabel: formatCurrency(Math.max(0, item.card.metrics.expenseTotalCents)),
      monthlyLimitCents: item.monthlyLimitCents,
      monthlyLimitLabel: formatCurrency(item.monthlyLimitCents),
      utilizationPct: clamp(item.utilizationPct, 0, 100),
      utilizationLabel: `${clamp(item.utilizationPct, 0, 999).toFixed(1)}%`,
      statusLabel: item.card.isActive ? "ATIVO" : "INATIVO",
    }));

    const nextHoldings: WalletHoldingVm[] = sorted
      .filter((item) => item.card.type === "investment")
      .map((item) => {
      const risk = "moderate" as const;
      const horizonLabel = "5-20 anos";
      const returnLabel = `${item.returnPct >= 0 ? "+" : ""}${item.returnPct.toFixed(1)}%`;

      return {
        accountId: item.card.id,
        accountName: item.card.name,
        type: item.card.type,
        aumCents: item.card.metrics.availableCents,
        aumLabel: formatCurrency(item.card.metrics.availableCents),
        allocationPct: item.allocationPct,
        allocationLabel: `${item.allocationPct.toFixed(1)}%`,
        returnPct: item.returnPct,
        returnLabel,
        risk,
        riskLabel: "MODERADO",
        horizonLabel,
        marketAssetLabel: item.card.investment
          ? `${item.card.investment.assetName} (${item.card.investment.assetSymbol.toUpperCase()})`
          : null,
        entryPriceLabel: item.card.investment
          ? formatCurrency(Math.round(item.card.investment.entryPriceBrl * 100))
          : null,
        currentPriceLabel: item.investmentQuote
          ? formatCurrency(Math.round(item.investmentQuote.priceBrl * 100))
          : null,
        marketUpdatedAtLabel: item.investmentQuote?.lastUpdatedAt
          ? new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(item.investmentQuote.lastUpdatedAt))
          : null,
      };
    });

    const capacityTotalCents = filteredCards.reduce((acc, card) => {
      if (card.type === "credit") {
        return acc + Math.max(0, card.creditLimitCents ?? 0);
      }
      return acc + Math.max(0, card.initialBalanceCents + card.metrics.incomeTotalCents);
    }, 0);

    const utilizedTotalCents = filteredCards.reduce((acc, card) => {
      if (card.type === "credit") {
        return acc + card.metrics.creditUsedCents;
      }
      return acc + card.metrics.expenseTotalCents;
    }, 0);

    const settledOutflowMonthCents = Array.from(flowByAccount.values()).reduce(
      (acc, flow) => acc + flow.settledOutflowMonthCents,
      0,
    );
    const currentSpentCents = Array.from(flowByAccount.values()).reduce(
      (acc, flow) => acc + flow.outflowMonthCents,
      0,
    );

    const currentNetMonth = Array.from(flowByAccount.values()).reduce(
      (acc, flow) => acc + flow.currentNetMonthCents,
      0,
    );
    const previousNetMonth = Array.from(flowByAccount.values()).reduce(
      (acc, flow) => acc + flow.previousNetMonthCents,
      0,
    );

    const monthChangePct = calculatePercentChange(currentNetMonth, previousNetMonth);

    const nextSummary: WalletPortfolioSummaryVm = {
      totalPortfolioCents: totalAumCents,
      totalPortfolioLabel: formatCurrency(totalAumCents),
      currentSpentCents,
      currentSpentLabel: formatCurrency(currentSpentCents),
      monthChangePct,
      monthChangeLabel: `${monthChangePct >= 0 ? "+" : ""}${monthChangePct.toFixed(1)}%`,
      efficiencyPct: clamp(
        ((capacityTotalCents - utilizedTotalCents) / Math.max(capacityTotalCents, 1)) * 100,
        0,
        999,
      ),
      liquidityPct: clamp(
        (totalAumCents / Math.max(settledOutflowMonthCents, 1)) * 100,
        0,
        999,
      ),
    };

    return {
      performanceRows: nextPerformanceRows,
      holdings: nextHoldings,
      summary: nextSummary,
    };
  }, [filteredCards, filteredTransactions, marketQuotesByAssetId, sortMode]);

  async function handleCreateCard(payload: CreateCardPayload) {
    setIsCreating(true);
    try {
      await readApiJson<{ item: CardDto }>("/api/cards", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await refreshData();
      setIsCreateOpen(false);
      toast.success("Conta/cartão criado com sucesso.");
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : "Não foi possível criar a conta/cartão.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateCard(payload: UpdateCardPayload) {
    if (!editingCard) {
      return;
    }

    setIsUpdating(true);
    try {
      await readApiJson<{ item: CardDto }>(`/api/cards/${editingCard.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refreshData();
      setEditingCard(null);
      toast.success("Cartão/conta atualizado(a) com sucesso.");
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : "Não foi possível atualizar a conta/cartão.";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteCard(cardId: string) {
    setDeletingId(cardId);
    try {
      const result = await readApiJson<{ id: string; action: "deleted" | "deactivated" }>(
        `/api/cards/${cardId}`,
        { method: "DELETE" },
      );

      await refreshData();
      setDeleteCandidate(null);

      if (result.action === "deactivated") {
        toast.success("Conta desativada para preservar o histórico de transações.");
      } else {
        toast.success("Conta removida com sucesso.");
      }
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : "Não foi possível remover a conta/cartão.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  function handleEditByAccountId(accountId: string) {
    const card = cards.find((item) => item.id === accountId) ?? null;
    setEditingCard(card);
  }

  function handleDeleteByAccountId(accountId: string) {
    const card = cards.find((item) => item.id === accountId) ?? null;
    setDeleteCandidate(card);
  }

  function handleCloseEditModal() {
    if (!isUpdating) {
      setEditingCard(null);
    }
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    if (value && dateTo && value > dateTo) {
      setDateTo(value);
    }
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    if (value && dateFrom && value < dateFrom) {
      setDateFrom(value);
    }
  }

  return (
    <main className="relative min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(134.5deg,#f8f7f6_0%,#eceae5_100%)]">
      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#171611] sm:text-4xl">
            Carteira
          </h1>
          <p className="text-sm text-[#877e64] sm:text-base">
            Analise seus ativos, acompanhe eficiência e gerencie contas em um único painel.
          </p>
        </header>

        <WalletHeaderBar
          searchValue={searchValue}
          totalPortfolioLabel={summary.totalPortfolioLabel}
          statusFilter={statusFilter}
          onSearchChange={setSearchValue}
          onStatusFilterChange={setStatusFilter}
          onOpenCreate={() => setIsCreateOpen(true)}
        />

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-44 rounded-[26px] bg-white/80" />
            <Skeleton className="h-64 rounded-3xl bg-white/80" />
            <Skeleton className="h-64 rounded-3xl bg-white/80" />
          </div>
        ) : (
          <>
            <WalletPortfolioOverview
              summary={summary}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={handleDateFromChange}
              onDateToChange={handleDateToChange}
            />
            <WalletPerformanceTable
              rows={performanceRows}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              deletingId={deletingId}
              onEdit={handleEditByAccountId}
              onDelete={handleDeleteByAccountId}
            />
            {holdings.length > 0 ? (
              <WalletStrategicHoldings
                items={holdings}
                deletingId={deletingId}
                onEdit={handleEditByAccountId}
                onDelete={handleDeleteByAccountId}
              />
            ) : null}
          </>
        )}
      </div>

      <WalletCreateModal
        open={isCreateOpen}
        isSubmitting={isCreating}
        fundingSourceAccounts={fundingSourceAccounts}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateCard}
      />

      <WalletEditModal
        open={Boolean(editingCard)}
        card={editingCard}
        isSubmitting={isUpdating}
        fundingSourceAccounts={fundingSourceAccounts}
        onClose={handleCloseEditModal}
        onSubmit={handleUpdateCard}
      />

      <AlertDialog
        open={Boolean(deleteCandidate)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deletingId) {
            setDeleteCandidate(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? `Deseja remover "${deleteCandidate.name}"? Se houver transações vinculadas, a conta será desativada para preservar o histórico.`
                : "Deseja remover esta conta/cartão?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              onClick={() => {
                if (!deleteCandidate) {
                  return;
                }
                void handleDeleteCard(deleteCandidate.id);
              }}
              disabled={Boolean(deletingId)}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deletingId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo
                </span>
              ) : (
                "Confirmar exclusão"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
