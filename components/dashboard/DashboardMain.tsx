"use client";

import type { ExpenseCategory } from "@/components/expenses/types";
import { expenseCategoryLabels } from "@/components/expenses/expense-mock-data";
import type {
  CardSummary,
  KpiCard,
  PortfolioChangeTone,
  PortfolioPoint,
  PortfolioSummary,
  SpendingCategory,
  Transaction,
  TransactionIcon,
} from "@/components/dashboard/types";
import ActiveCardsPanel from "@/components/dashboard/sections/ActiveCardsPanel";
import KpiRow from "@/components/dashboard/sections/KpiRow";
import PortfolioChartCard from "@/components/dashboard/sections/PortfolioChartCard";
import RecentTransactionsTable from "@/components/dashboard/sections/RecentTransactionsTable";
import SpendingCategoryCard from "@/components/dashboard/sections/SpendingCategoryCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { readCookieJson, writeCookieJson } from "@/src/lib/client-cookies";
import {
  invalidateFinanceSnapshotQuery,
  useFinanceSnapshotQuery,
} from "@/src/lib/queries/finance";
import { useTelegramRealtimeRefresh } from "@/src/lib/realtime/useTelegramRealtimeRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CalendarRange, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const enterEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

type CardFilter = "all" | string;
type TagFilter = "all" | string;

const DASHBOARD_FILTERS_COOKIE = "fluxy_dashboard_filters_v1";

type ApiFinancialAccountType = "credit" | "debit" | "investment";
type ApiTransactionKind = "expense" | "income";

type ApiCardDto = {
  id: string;
  name: string;
  type: ApiFinancialAccountType;
  last4Digits: string | null;
  creditLimitCents: number | null;
  initialBalanceCents: number;
  isActive: boolean;
  metrics: {
    availableCents: number;
    incomeTotalCents: number;
    expenseTotalCents: number;
    creditUsedCents: number;
    utilizationPct: number;
  };
};

type ApiTransactionDto = {
  id: string;
  accountId: string;
  kind: ApiTransactionKind;
  category: string;
  merchant: string;
  amountCents: number;
  occurredAt: string;
};

type DashboardTransaction = Transaction & {
  amountValue: number;
  kind: ApiTransactionKind;
  occurredAtISO: string;
  occurredDateISO: string;
};

const EMPTY_CARDS: ApiCardDto[] = [];
const EMPTY_TRANSACTIONS: ApiTransactionDto[] = [];

const categoryColorMap: Record<string, string> = {
  alimentacao: "#787F5B",
  transporte: "#8A816F",
  moradia: "#B38C19",
  assinaturas: "#6E7A96",
  lazer: "#B36F4F",
  saude: "#638B7A",
  educacao: "#8B6E9C",
  outros: "#A38E6A",
};

function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCurrencyWithDecimalsFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateLabel(occurredAtISO: string) {
  const date = new Date(occurredAtISO);
  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffInDays = Math.floor((today.getTime() - target.getTime()) / 86_400_000);

  if (diffInDays === 0) return "Hoje";
  if (diffInDays === 1) return "Ontem";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toISODateLocal(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: toISODateLocal(firstDay),
    dateTo: toISODateLocal(lastDay),
  };
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mergeSavedDashboardFilters(
  defaults: {
    dateFrom: string;
    dateTo: string;
    cardFilter: CardFilter;
    tagFilter: TagFilter;
  },
  saved: {
    dateFrom?: unknown;
    dateTo?: unknown;
    cardFilter?: unknown;
    tagFilter?: unknown;
  } | null,
): {
  dateFrom: string;
  dateTo: string;
  cardFilter: CardFilter;
  tagFilter: TagFilter;
} {
  if (!saved) {
    return defaults;
  }

  const next = {
    dateFrom: isISODate(saved.dateFrom) ? saved.dateFrom : defaults.dateFrom,
    dateTo: isISODate(saved.dateTo) ? saved.dateTo : defaults.dateTo,
    cardFilter: typeof saved.cardFilter === "string" ? saved.cardFilter : defaults.cardFilter,
    tagFilter: typeof saved.tagFilter === "string" ? saved.tagFilter : defaults.tagFilter,
  };

  if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) {
    return {
      ...next,
      dateTo: next.dateFrom,
    };
  }

  return next;
}

function formatDateRangeLabel(dateFrom: string, dateTo: string) {
  const formatSingle = (dateValue: string) => {
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return "Data";
    }
    return parsed.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  if (dateFrom && dateTo) {
    return `${formatSingle(dateFrom)} - ${formatSingle(dateTo)}`;
  }

  if (dateFrom) {
    return `${formatSingle(dateFrom)} em diante`;
  }

  if (dateTo) {
    return `Até ${formatSingle(dateTo)}`;
  }

  return "Período";
}

function addDays(dateISO: string, offset: number) {
  const base = new Date(`${dateISO}T00:00:00`);
  base.setDate(base.getDate() + offset);
  return toISODateLocal(base);
}

function getDaysDiffInclusive(dateFrom: string, dateTo: string) {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  const diffMs = to.getTime() - from.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  return Math.max(1, diffDays + 1);
}

function toCategoryLabel(category: string) {
  const key = category as ExpenseCategory;
  if (key in expenseCategoryLabels) {
    return expenseCategoryLabels[key];
  }

  const normalized = category.replace(/[-_]/g, " ").trim();
  if (!normalized) {
    return "Outros";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toTransactionIcon(category: string): TransactionIcon {
  const normalized = category.toLowerCase();

  if (normalized.includes("viag") || normalized.includes("transporte")) {
    return "plane";
  }

  if (normalized.includes("alimenta") || normalized.includes("restaurante")) {
    return "utensils";
  }

  return "shopping";
}

function formatPercentChange(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) {
      return "0.0%";
    }
    return "+100.0%";
  }

  const value = ((current - previous) / previous) * 100;
  const signal = value > 0 ? "+" : "";
  return `${signal}${value.toFixed(1)}%`;
}

function calculateSignedPercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return 0;
    }
    return current > 0 ? 100 : -100;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatSignedPercent(value: number) {
  const signal = value > 0 ? "+" : "";
  return `${signal}${value.toFixed(1)}%`;
}

function toPortfolioChangeTone(value: number): PortfolioChangeTone {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
}

function formatSignedCurrencyFromCents(cents: number) {
  const absoluteLabel = formatCurrencyWithDecimalsFromCents(Math.abs(cents));
  if (cents > 0) {
    return `+${absoluteLabel}`;
  }
  if (cents < 0) {
    return `-${absoluteLabel}`;
  }
  return absoluteLabel;
}

function getSectionVariants(reduceMotion: boolean): {
  container: Variants;
  section: Variants;
} {
  if (reduceMotion) {
    return {
      container: {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { duration: 0.18, when: "beforeChildren", staggerChildren: 0.03 },
        },
      },
      section: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.14 } },
      },
    };
  }

  return {
    container: {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.32,
          ease: enterEase,
          when: "beforeChildren",
          staggerChildren: 0.07,
        },
      },
    },
    section: {
      hidden: { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.26, ease: enterEase },
      },
    },
  };
}

function getButtonClass(active: boolean) {
  return [
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    active ? "bg-[#f6f4ef] text-[#171611]" : "text-[#171611] hover:bg-[#f6f4ef]",
  ].join(" ");
}

function mapCardsToSummary(cards: ApiCardDto[]): CardSummary[] {
  return cards.map((card, index) => {
    const isCredit = card.type === "credit";
    const theme = /black/i.test(card.name) || (isCredit && index === 0) ? "dark" : "light";

    const limitCents = isCredit
      ? card.creditLimitCents ?? Math.max(card.metrics.creditUsedCents, 1)
      : Math.max(card.initialBalanceCents + card.metrics.incomeTotalCents, 1);

    const usedCents = isCredit
      ? card.metrics.creditUsedCents
      : card.metrics.expenseTotalCents;

    const usedPercent = Math.max(0.02, Math.min(1, usedCents / Math.max(limitCents, 1)));

    return {
      id: card.id,
      name: card.name,
      maskedNumber: card.last4Digits ? `**** ${card.last4Digits}` : "Conta digital",
      usedLabel: formatCurrencyWithDecimalsFromCents(usedCents),
      limitLabel: formatCurrencyWithDecimalsFromCents(limitCents),
      usedPercent,
      cardHolder: "Usuário",
      expires: card.last4Digits ? "Ativo" : "--/--",
      theme,
    };
  });
}

function mapTransactions(transactions: ApiTransactionDto[]): DashboardTransaction[] {
  return transactions.map((transaction) => {
    const categoryLabel = toCategoryLabel(transaction.category);
    const amountLabel = `${transaction.kind === "income" ? "+" : "-"}${formatCurrencyWithDecimalsFromCents(transaction.amountCents)}`;
    const occurredDateISO = transaction.occurredAt.slice(0, 10);

    return {
      id: transaction.id,
      merchant: transaction.merchant,
      category: categoryLabel,
      date: formatDateLabel(transaction.occurredAt),
      amount: amountLabel,
      icon: toTransactionIcon(transaction.category),
      cardId: transaction.accountId,
      tag: transaction.category,
      ageInMonths: 0,
      amountValue: transaction.amountCents,
      kind: transaction.kind,
      occurredAtISO: transaction.occurredAt,
      occurredDateISO,
    };
  });
}

function buildSpendingSummary(filteredTransactions: DashboardTransaction[]): {
  categories: SpendingCategory[];
  totalLabel: string;
} {
  const amountByCategory = new Map<string, number>();

  for (const transaction of filteredTransactions) {
    if (transaction.kind !== "expense") {
      continue;
    }

    const current = amountByCategory.get(transaction.category) ?? 0;
    amountByCategory.set(transaction.category, current + transaction.amountValue);
  }

  const total = Array.from(amountByCategory.values()).reduce((acc, value) => acc + value, 0);

  if (total <= 0) {
    return {
      categories: [{ id: "empty", label: "Sem gastos", percent: 100, color: "#e5e1d8" }],
      totalLabel: formatCurrencyFromCents(0),
    };
  }

  const sorted = Array.from(amountByCategory.entries()).sort((a, b) => b[1] - a[1]);

  const categories = sorted.map(([label, amount], index) => {
    const percent = Math.max(1, Math.round((amount / total) * 100));
    const key = label.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

    return {
      id: `spending-${index}-${key}`,
      label,
      percent,
      color: categoryColorMap[key] ?? "#8A816F",
    };
  });

  return {
    categories,
    totalLabel: formatCurrencyFromCents(total),
  };
}

function normalizeDateRange(dateFrom: string, dateTo: string) {
  const defaults = getCurrentMonthDateRange();
  const normalizedDateFrom = isISODate(dateFrom) ? dateFrom : defaults.dateFrom;
  const normalizedDateTo = isISODate(dateTo) ? dateTo : defaults.dateTo;

  if (normalizedDateFrom <= normalizedDateTo) {
    return {
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
    };
  }

  return {
    dateFrom: normalizedDateTo,
    dateTo: normalizedDateFrom,
  };
}

function toSignedAmount(transaction: DashboardTransaction) {
  return transaction.kind === "income" ? transaction.amountValue : -transaction.amountValue;
}

function sumNetCents(transactions: DashboardTransaction[]) {
  return transactions.reduce((acc, transaction) => acc + toSignedAmount(transaction), 0);
}

function formatDailyPointLabel(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatMonthlyPointLabel(monthKey: string) {
  const monthDate = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(monthDate.getTime())) {
    return "--";
  }

  const shortLabel = monthDate
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");

  return shortLabel.charAt(0).toUpperCase() + shortLabel.slice(1, 3);
}

function buildDailyPortfolioPoints(
  filteredTransactions: DashboardTransaction[],
  dateFrom: string,
  dateTo: string,
) {
  const netByDate = new Map<string, number>();

  for (const transaction of filteredTransactions) {
    const current = netByDate.get(transaction.occurredDateISO) ?? 0;
    netByDate.set(transaction.occurredDateISO, current + toSignedAmount(transaction));
  }

  const points: PortfolioPoint[] = [];
  let cumulativeCents = 0;
  let cursor = dateFrom;

  while (cursor <= dateTo) {
    cumulativeCents += netByDate.get(cursor) ?? 0;
    points.push({
      label: formatDailyPointLabel(cursor),
      value: Number((cumulativeCents / 100).toFixed(2)),
    });
    cursor = addDays(cursor, 1);
  }

  return points;
}

function buildMonthlyPortfolioPoints(
  filteredTransactions: DashboardTransaction[],
  dateFrom: string,
  dateTo: string,
) {
  const netByMonth = new Map<string, number>();

  for (const transaction of filteredTransactions) {
    const monthKey = transaction.occurredDateISO.slice(0, 7);
    const current = netByMonth.get(monthKey) ?? 0;
    netByMonth.set(monthKey, current + toSignedAmount(transaction));
  }

  const points: PortfolioPoint[] = [];
  let cumulativeCents = 0;

  const cursor = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  cursor.setDate(1);
  end.setDate(1);

  while (cursor <= end) {
    const monthKey = `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, "0")}`;
    cumulativeCents += netByMonth.get(monthKey) ?? 0;

    points.push({
      label: formatMonthlyPointLabel(monthKey),
      value: Number((cumulativeCents / 100).toFixed(2)),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return points;
}

function downsamplePortfolioPoints(points: PortfolioPoint[], maxPoints = 12) {
  if (points.length <= maxPoints) {
    return points;
  }

  const sampled: PortfolioPoint[] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);
  let lastSampledIndex = 0;

  for (let index = 1; index < maxPoints - 1; index += 1) {
    let sampledIndex = Math.round(index * step);

    if (sampledIndex <= lastSampledIndex) {
      sampledIndex = lastSampledIndex + 1;
    }

    if (sampledIndex >= points.length - 1) {
      sampledIndex = points.length - 2;
    }

    sampled.push(points[sampledIndex]);
    lastSampledIndex = sampledIndex;
  }

  sampled.push(points[points.length - 1]);
  return sampled;
}

function buildPortfolioData(params: {
  filteredTransactions: DashboardTransaction[];
  cardAndTagFilteredTransactions: DashboardTransaction[];
  dateFrom: string;
  dateTo: string;
}): {
  points: PortfolioPoint[];
  summary: PortfolioSummary;
} {
  const { filteredTransactions, cardAndTagFilteredTransactions, dateFrom, dateTo } = params;
  const normalizedRange = normalizeDateRange(dateFrom, dateTo);
  const periodLength = getDaysDiffInclusive(normalizedRange.dateFrom, normalizedRange.dateTo);
  const useDailyGranularity = periodLength <= 45;

  const rawPoints = useDailyGranularity
    ? buildDailyPortfolioPoints(
      filteredTransactions,
      normalizedRange.dateFrom,
      normalizedRange.dateTo,
    )
    : buildMonthlyPortfolioPoints(
      filteredTransactions,
      normalizedRange.dateFrom,
      normalizedRange.dateTo,
    );

  const periodNetCents = sumNetCents(filteredTransactions);
  const previousDateTo = addDays(normalizedRange.dateFrom, -1);
  const previousDateFrom = addDays(previousDateTo, -(periodLength - 1));

  const previousPeriodTransactions = cardAndTagFilteredTransactions.filter((transaction) => (
    transaction.occurredDateISO >= previousDateFrom
    && transaction.occurredDateISO <= previousDateTo
  ));

  const previousPeriodNetCents = sumNetCents(previousPeriodTransactions);
  const periodChangePct = calculateSignedPercentChange(periodNetCents, previousPeriodNetCents);

  return {
    points: downsamplePortfolioPoints(rawPoints, 12),
    summary: {
      periodNetCents,
      periodNetLabel: formatSignedCurrencyFromCents(periodNetCents),
      previousPeriodNetCents,
      periodChangePct,
      periodChangeLabel: formatSignedPercent(periodChangePct),
      periodChangeTone: toPortfolioChangeTone(periodChangePct),
      subtitle: "Resultado liquido no periodo selecionado",
    },
  };
}

export default function DashboardMain() {
  const prefersReducedMotion = useReducedMotion();
  const variants = getSectionVariants(Boolean(prefersReducedMotion));
  const queryClient = useQueryClient();
  const financeSnapshotQuery = useFinanceSnapshotQuery();
  const [hasRestoredFilters, setHasRestoredFilters] = useState(false);

  const [dateRange, setDateRange] = useState(() => ({
    ...getCurrentMonthDateRange(),
  }));
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const isLoading = financeSnapshotQuery.isLoading;
  const cardsData = useMemo(
    () => (financeSnapshotQuery.data?.cards ?? EMPTY_CARDS).filter((card) => card.isActive),
    [financeSnapshotQuery.data?.cards],
  );
  const snapshotTransactions = financeSnapshotQuery.data?.transactions ?? EMPTY_TRANSACTIONS;
  const transactionsData = useMemo(
    () => mapTransactions(snapshotTransactions),
    [snapshotTransactions],
  );

  useEffect(() => {
    if (!financeSnapshotQuery.isError) {
      return;
    }

    const message = financeSnapshotQuery.error instanceof Error
      ? financeSnapshotQuery.error.message
      : "Não foi possível carregar os dados reais do dashboard.";
    toast.error(message);
  }, [
    financeSnapshotQuery.error,
    financeSnapshotQuery.errorUpdatedAt,
    financeSnapshotQuery.isError,
  ]);

  const handleRealtimeRefresh = useCallback(async () => {
    await invalidateFinanceSnapshotQuery(queryClient);
  }, [queryClient]);

  useTelegramRealtimeRefresh({
    onRefresh: handleRealtimeRefresh,
    toastMessage: "Nova despesa via Telegram.",
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const defaults = {
      ...getCurrentMonthDateRange(),
      cardFilter: "all" as CardFilter,
      tagFilter: "all" as TagFilter,
    };
    const saved = readCookieJson<{
      dateFrom?: unknown;
      dateTo?: unknown;
      cardFilter?: unknown;
      tagFilter?: unknown;
    }>(DASHBOARD_FILTERS_COOKIE);

    const restored = mergeSavedDashboardFilters(defaults, saved);
    setDateRange({ dateFrom: restored.dateFrom, dateTo: restored.dateTo });
    setCardFilter(restored.cardFilter);
    setTagFilter(restored.tagFilter);
    setHasRestoredFilters(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredFilters) {
      return;
    }

    writeCookieJson(DASHBOARD_FILTERS_COOKIE, {
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
      cardFilter,
      tagFilter,
    });
  }, [cardFilter, dateRange.dateFrom, dateRange.dateTo, hasRestoredFilters, tagFilter]);

  const activeCards = useMemo(() => mapCardsToSummary(cardsData), [cardsData]);

  const cardOptions = useMemo(
    () => [
      { value: "all", label: "Todos os cartões" },
      ...activeCards.map((card) => ({ value: card.id, label: card.name })),
    ],
    [activeCards],
  );

  const tagOptions = useMemo(() => {
    const uniqueTags = new Map<string, string>();

    for (const transaction of transactionsData) {
      if (!uniqueTags.has(transaction.tag)) {
        uniqueTags.set(transaction.tag, transaction.category);
      }
    }

    return [
      { value: "all", label: "Todas as etiquetas" },
      ...Array.from(uniqueTags.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [transactionsData]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (cardFilter !== "all" && !cardOptions.some((option) => option.value === cardFilter)) {
      setCardFilter("all");
    }
  }, [cardFilter, cardOptions, isLoading]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (tagFilter !== "all" && !tagOptions.some((option) => option.value === tagFilter)) {
      setTagFilter("all");
    }
  }, [tagFilter, tagOptions, isLoading]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedCard = cardOptions.find((option) => option.value === cardFilter) ?? cardOptions[0];
  const selectedTag = tagOptions.find((option) => option.value === tagFilter) ?? tagOptions[0];
  const selectedDateRangeLabel = formatDateRangeLabel(dateRange.dateFrom, dateRange.dateTo);

  const cardAndTagFilteredTransactions = useMemo(() => {
    return transactionsData.filter((transaction) => {
      const byCard = cardFilter === "all" || transaction.cardId === cardFilter;
      const byTag = tagFilter === "all" || transaction.tag === tagFilter;
      return byCard && byTag;
    });
  }, [cardFilter, tagFilter, transactionsData]);

  const filteredTransactions = useMemo(() => {
    return cardAndTagFilteredTransactions.filter((transaction) => {
      if (dateRange.dateFrom && transaction.occurredDateISO < dateRange.dateFrom) {
        return false;
      }

      if (dateRange.dateTo && transaction.occurredDateISO > dateRange.dateTo) {
        return false;
      }

      return true;
    });
  }, [cardAndTagFilteredTransactions, dateRange.dateFrom, dateRange.dateTo]);

  const filteredCards = useMemo(() => {
    if (cardFilter === "all") {
      return activeCards;
    }

    return activeCards.filter((card) => card.id === cardFilter);
  }, [activeCards, cardFilter]);

  const spendingSummary = useMemo(
    () => buildSpendingSummary(filteredTransactions),
    [filteredTransactions],
  );

  const portfolioData = useMemo(
    () =>
      buildPortfolioData({
        filteredTransactions,
        cardAndTagFilteredTransactions,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
      }),
    [
      cardAndTagFilteredTransactions,
      dateRange.dateFrom,
      dateRange.dateTo,
      filteredTransactions,
    ],
  );

  const cardsForAvailableBalance = useMemo(() => {
    if (cardFilter === "all") {
      return cardsData;
    }

    return cardsData.filter((card) => card.id === cardFilter);
  }, [cardFilter, cardsData]);

  const kpiCards = useMemo<KpiCard[]>(() => {
    const totalAvailableCents = cardsForAvailableBalance.reduce(
      (acc, card) => acc + card.metrics.availableCents,
      0,
    );
    const selectedAccountsCount = cardsForAvailableBalance.length;
    const accountsLabel = cardFilter === "all" ? "contas ativas" : "contas selecionadas";

    const inflowCurrent = filteredTransactions
      .filter((transaction) => transaction.kind === "income")
      .reduce((acc, transaction) => acc + transaction.amountValue, 0);

    const outflowCurrent = filteredTransactions
      .filter((transaction) => transaction.kind === "expense")
      .reduce((acc, transaction) => acc + transaction.amountValue, 0);

    const periodLength = getDaysDiffInclusive(dateRange.dateFrom, dateRange.dateTo);
    const previousDateTo = addDays(dateRange.dateFrom, -1);
    const previousDateFrom = addDays(previousDateTo, -(periodLength - 1));
    const previousRangeLabel = formatDateRangeLabel(previousDateFrom, previousDateTo);

    const previousTransactions = cardAndTagFilteredTransactions.filter((transaction) => (
      transaction.occurredDateISO >= previousDateFrom
      && transaction.occurredDateISO <= previousDateTo
    ));

    const inflowPrevious = previousTransactions
      .filter((transaction) => transaction.kind === "income")
      .reduce((acc, transaction) => acc + transaction.amountValue, 0);

    const outflowPrevious = previousTransactions
      .filter((transaction) => transaction.kind === "expense")
      .reduce((acc, transaction) => acc + transaction.amountValue, 0);

    const inflowChange = formatPercentChange(inflowCurrent, inflowPrevious);
    const outflowChange = formatPercentChange(outflowCurrent, outflowPrevious);

    const inflowPercent = Number(inflowChange.replace("%", ""));
    const outflowPercent = Number(outflowChange.replace("%", ""));

    return [
      {
        id: "available-balance",
        title: "Saldo disponível",
        value: formatCurrencyFromCents(totalAvailableCents),
        change: `${selectedAccountsCount}`,
        changeLabel: accountsLabel,
        tone: "positive",
        icon: "bank",
      },
      {
        id: "period-inflow",
        title: "Entradas do período",
        value: formatCurrencyFromCents(inflowCurrent),
        change: inflowChange,
        changeLabel: `vs ${previousRangeLabel}`,
        tone: inflowPercent >= 0 ? "positive" : "negative",
        icon: "piggy",
      },
      {
        id: "period-outflow",
        title: "Saídas do período",
        value: formatCurrencyFromCents(outflowCurrent),
        change: outflowChange,
        changeLabel: `vs ${previousRangeLabel}`,
        tone: outflowPercent > 0 ? "warning" : "positive",
        icon: "wallet",
      },
    ];
  }, [
    cardAndTagFilteredTransactions,
    cardFilter,
    cardsForAvailableBalance,
    dateRange.dateFrom,
    dateRange.dateTo,
    filteredTransactions,
  ]);

  if (isLoading) {
    return (
      <main className="relative min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(134.5deg,#f8f7f6_0%,#eceae5_100%)]">
        <div className="relative mx-auto w-full max-w-[1280px] space-y-8 p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-28 rounded-3xl bg-white/70" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-3xl bg-white/70" />
            <Skeleton className="h-40 rounded-3xl bg-white/70" />
            <Skeleton className="h-40 rounded-3xl bg-white/70" />
          </div>
          <Skeleton className="h-[320px] rounded-3xl bg-white/70" />
          <Skeleton className="h-[280px] rounded-3xl bg-white/70" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(134.5deg,#f8f7f6_0%,#eceae5_100%)]">
      <div className="pointer-events-none absolute -right-28 -top-24 h-[440px] w-[440px] rounded-full bg-[#b38c19]/5 blur-3xl" />

      <motion.div
        className="relative mx-auto w-full max-w-[1280px] space-y-8 p-4 sm:p-6 lg:p-8"
        initial="hidden"
        animate="visible"
        variants={variants.container}
      >
        <motion.header
          variants={variants.section}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#171611] sm:text-4xl">
              Visão geral financeira
            </h1>
            <p className="mt-1 text-sm text-[#877e64] sm:text-base">
              Acompanhe seu saldo, movimentações e hábitos com dados reais da conta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#f3f4f6] bg-white p-2 shadow-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={getButtonClass(true)}>
                  <CalendarRange className="h-4 w-4 text-[#8d836b]" />
                  {selectedDateRangeLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[320px] rounded-xl p-3">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f7761]">
                      Data inicial
                    </label>
                    <Input
                      type="date"
                      value={dateRange.dateFrom}
                      onChange={(event) =>
                        setDateRange((previous) => ({
                          ...previous,
                          dateFrom: event.target.value,
                          dateTo:
                            previous.dateTo
                            && event.target.value
                            && previous.dateTo < event.target.value
                              ? event.target.value
                              : previous.dateTo,
                        }))
                      }
                      className="h-10 rounded-lg border-[#e8e2d6] bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f7761]">
                      Data final
                    </label>
                    <Input
                      type="date"
                      value={dateRange.dateTo}
                      onChange={(event) =>
                        setDateRange((previous) => ({
                          ...previous,
                          dateTo: event.target.value,
                          dateFrom:
                            previous.dateFrom
                            && event.target.value
                            && previous.dateFrom > event.target.value
                              ? event.target.value
                              : previous.dateFrom,
                        }))
                      }
                      className="h-10 rounded-lg border-[#e8e2d6] bg-white"
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="h-4 w-px bg-[#e5e7eb]" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={getButtonClass(cardFilter !== "all")}>
                  {selectedCard.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuRadioGroup
                  value={cardFilter}
                  onValueChange={(value) => setCardFilter(value as CardFilter)}
                >
                  {cardOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="h-4 w-px bg-[#e5e7eb]" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={getButtonClass(tagFilter !== "all")}>
                  <SlidersHorizontal className="h-4 w-4" />
                  {selectedTag.label}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuRadioGroup
                  value={tagFilter}
                  onValueChange={(value) => setTagFilter(value as TagFilter)}
                >
                  {tagOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        <motion.section variants={variants.section}>
          <KpiRow cards={kpiCards} />
        </motion.section>

        <motion.section variants={variants.section} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PortfolioChartCard points={portfolioData.points} summary={portfolioData.summary} />
          </div>

          <SpendingCategoryCard
            categories={spendingSummary.categories}
            totalLabel={spendingSummary.totalLabel}
          />

          <div className="xl:col-span-3">
            <ActiveCardsPanel cards={filteredCards} />
          </div>
        </motion.section>

        <motion.section variants={variants.section}>
          <RecentTransactionsTable transactions={filteredTransactions} />
        </motion.section>
      </motion.div>
    </main>
  );
}
