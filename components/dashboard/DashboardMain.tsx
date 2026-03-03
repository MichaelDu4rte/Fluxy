"use client";

import {
  activeCards,
  kpiCards,
  portfolioPoints,
  recentTransactions,
  spendingCategories,
} from "@/components/dashboard/dashboard-mock-data";
import type { SpendingCategory } from "@/components/dashboard/types";
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
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

const enterEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

type PeriodFilter = "this-month" | "last-3-months" | "last-12-months";
type CardFilter = "all" | string;
type TagFilter = "all" | string;

const periodOptions: Array<{ value: PeriodFilter; label: string; maxAgeInMonths: number }> = [
  { value: "this-month", label: "Este mês", maxAgeInMonths: 0 },
  { value: "last-3-months", label: "Últimos 3 meses", maxAgeInMonths: 2 },
  { value: "last-12-months", label: "Últimos 12 meses", maxAgeInMonths: 11 },
];

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

function parseCurrencyAmount(amount: string) {
  const parsed = Number.parseFloat(amount.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function formatCurrencyLabel(value: number) {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

function buildSpendingSummary(filteredAmounts: Map<string, number>): {
  categories: SpendingCategory[];
  totalLabel: string;
} {
  const total = Array.from(filteredAmounts.values()).reduce((acc, value) => acc + value, 0);

  if (total <= 0) {
    return {
      categories: spendingCategories,
      totalLabel: "$0",
    };
  }

  const colorByCategory = new Map(spendingCategories.map((category) => [category.label, category.color]));

  const sorted = Array.from(filteredAmounts.entries()).sort((a, b) => b[1] - a[1]);

  const categories = sorted.map(([label, amount], index) => {
    const percent = Math.round((amount / total) * 100);

    return {
      id: `filtered-${label.toLowerCase().replace(/\s+/g, "-")}-${index}`,
      label,
      percent,
      color: colorByCategory.get(label) ?? "#8A816F",
    };
  });

  return {
    categories,
    totalLabel: formatCurrencyLabel(total),
  };
}

function getButtonClass(active: boolean) {
  return [
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    active ? "bg-[#f6f4ef] text-[#171611]" : "text-[#171611] hover:bg-[#f6f4ef]",
  ].join(" ");
}

export default function DashboardMain() {
  const prefersReducedMotion = useReducedMotion();
  const variants = getSectionVariants(Boolean(prefersReducedMotion));

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this-month");
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");

  const cardOptions = useMemo(
    () => [
      { value: "all", label: "Todos os cartões" },
      ...activeCards.map((card) => ({ value: card.id, label: card.name })),
    ],
    [],
  );

  const tagOptions = useMemo(() => {
    const uniqueTags = new Map<string, string>();

    for (const transaction of recentTransactions) {
      if (!uniqueTags.has(transaction.tag)) {
        uniqueTags.set(transaction.tag, transaction.category);
      }
    }

    return [
      { value: "all", label: "Todas as etiquetas" },
      ...Array.from(uniqueTags.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, []);

  const selectedPeriod = periodOptions.find((option) => option.value === periodFilter) ?? periodOptions[0];
  const selectedCard = cardOptions.find((option) => option.value === cardFilter) ?? cardOptions[0];
  const selectedTag = tagOptions.find((option) => option.value === tagFilter) ?? tagOptions[0];

  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter((transaction) => {
      const withinPeriod = transaction.ageInMonths <= selectedPeriod.maxAgeInMonths;
      const byCard = cardFilter === "all" || transaction.cardId === cardFilter;
      const byTag = tagFilter === "all" || transaction.tag === tagFilter;

      return withinPeriod && byCard && byTag;
    });
  }, [cardFilter, selectedPeriod.maxAgeInMonths, tagFilter]);

  const filteredCards = useMemo(() => {
    if (cardFilter === "all") {
      return activeCards;
    }

    return activeCards.filter((card) => card.id === cardFilter);
  }, [cardFilter]);

  const spendingSummary = useMemo(() => {
    const amountByCategory = new Map<string, number>();

    for (const transaction of filteredTransactions) {
      const current = amountByCategory.get(transaction.category) ?? 0;
      amountByCategory.set(transaction.category, current + parseCurrencyAmount(transaction.amount));
    }

    return buildSpendingSummary(amountByCategory);
  }, [filteredTransactions]);

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
              Acompanhe a distribuição do seu patrimônio e seus hábitos de gastos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#f3f4f6] bg-white p-2 shadow-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={getButtonClass(true)}>
                  {selectedPeriod.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">
                <DropdownMenuRadioGroup
                  value={periodFilter}
                  onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}
                >
                  {periodOptions.map((option) => (
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
            <PortfolioChartCard points={portfolioPoints} />
          </div>

          <SpendingCategoryCard
            categories={spendingSummary.categories}
            totalLabel={spendingSummary.totalLabel}
          />

          <div className={filteredCards.length < 3 ? "xl:col-span-3" : "xl:col-span-2"}>
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
