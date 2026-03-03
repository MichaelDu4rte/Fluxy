"use client";

import type {
  ExpenseAccountId,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseType,
} from "@/components/expenses/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarRange, CreditCard, Search, SlidersHorizontal, Tag, X } from "lucide-react";

type ExpensesToolbarProps = {
  search: string;
  dateFrom: string;
  dateTo: string;
  category: "todas" | ExpenseCategory;
  card: "all" | ExpenseAccountId;
  status: "todos" | ExpenseStatus;
  type: "todos" | ExpenseType;
  categoryOptions: Array<{ value: "todas" | ExpenseCategory; label: string }>;
  cardOptions: Array<{ value: "all" | ExpenseAccountId; label: string }>;
  statusOptions: Array<{ value: "todos" | ExpenseStatus; label: string }>;
  typeOptions: Array<{ value: "todos" | ExpenseType; label: string }>;
  onSearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onCategoryChange: (value: "todas" | ExpenseCategory) => void;
  onCardChange: (value: "all" | ExpenseAccountId) => void;
  onStatusChange: (value: "todos" | ExpenseStatus) => void;
  onTypeChange: (value: "todos" | ExpenseType) => void;
  onClear: () => void;
};

function formatDateLabel(dateValue: string) {
  if (!dateValue) {
    return "Data";
  }

  const parsed = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Data";
  }

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function getDateRangeLabel(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) {
    return `${formatDateLabel(dateFrom)} - ${formatDateLabel(dateTo)}`;
  }

  if (dateFrom) {
    return `${formatDateLabel(dateFrom)} em diante`;
  }

  if (dateTo) {
    return `Até ${formatDateLabel(dateTo)}`;
  }

  return "Data";
}

export default function ExpensesToolbar({
  search,
  dateFrom,
  dateTo,
  category,
  card,
  status,
  type,
  categoryOptions,
  cardOptions,
  statusOptions,
  typeOptions,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onCategoryChange,
  onCardChange,
  onStatusChange,
  onTypeChange,
  onClear,
}: ExpensesToolbarProps) {
  const dateLabel = getDateRangeLabel(dateFrom, dateTo);

  return (
    <section className="rounded-2xl border border-[#e7e2d7] bg-white/90 p-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1" aria-label="Buscar por descrição ou categoria">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91886f]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search merchant or category..."
            className="h-11 rounded-xl border-0 bg-transparent pl-9 text-[#171611] placeholder:text-[#a39a83] focus-visible:ring-0"
          />
        </label>

        <span className="hidden h-6 w-px bg-[#ece7db] sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[#423d31] transition-colors hover:bg-[#f6f3ea]"
              aria-label="Selecionar intervalo de datas"
            >
              <CalendarRange className="h-4 w-4 text-[#8d836b]" />
              <span>{dateLabel}</span>
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
                  value={dateFrom}
                  onChange={(event) => onDateFromChange(event.target.value)}
                  className="h-10 rounded-lg border-[#e8e2d6] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f7761]">
                  Data final
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => onDateToChange(event.target.value)}
                  className="h-10 rounded-lg border-[#e8e2d6] bg-white"
                />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select
          value={category}
          onValueChange={(value) => onCategoryChange(value as "todas" | ExpenseCategory)}
        >
          <SelectTrigger className="h-10 w-auto min-w-[150px] rounded-xl border-0 bg-transparent px-3 text-[#423d31] hover:bg-[#f6f3ea]">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#8d836b]" />
              <SelectValue placeholder="Categories" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={card} onValueChange={(value) => onCardChange(value as "all" | ExpenseAccountId)}>
          <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl border-0 bg-transparent px-3 text-[#423d31] hover:bg-[#f6f3ea]">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#8d836b]" />
              <SelectValue placeholder="All Cards" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {cardOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#171611] text-white transition-colors hover:bg-[#2a2720]"
              aria-label="Abrir filtros avançados"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px] rounded-xl p-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f7761]">
                  Status
                </label>
                <Select
                  value={status}
                  onValueChange={(value) => onStatusChange(value as "todos" | ExpenseStatus)}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-[#e8e2d6] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f7761]">
                  Tipo
                </label>
                <Select value={type} onValueChange={(value) => onTypeChange(value as "todos" | ExpenseType)}>
                  <SelectTrigger className="h-10 w-full rounded-lg border-[#e8e2d6] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-lg border-[#e2ddcf] bg-white text-[#4d4636]"
                onClick={onClear}
              >
                <X className="h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
