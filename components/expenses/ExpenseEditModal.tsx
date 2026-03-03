"use client";

import {
  expenseCategoryLabels,
  expenseStatusLabels,
} from "@/components/expenses/expense-mock-data";
import {
  formatAmountFromNumber,
  formatAmountInput,
  getAmountSizeClasses,
  getTodayISODate,
  parseDecimalValue,
} from "@/components/expenses/modal-helpers";
import type {
  DeleteExpenseInput,
  ExpenseAccount,
  ExpenseCategory,
  ExpenseEditScope,
  ExpenseItem,
  ExpenseStatus,
  UpdateExpenseInput,
} from "@/components/expenses/types";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarRange,
  CarTaxiFront,
  CircleHelp,
  GraduationCap,
  HeartPulse,
  House,
  Loader2,
  Popcorn,
  ReceiptText,
  ShoppingCart,
  X,
} from "lucide-react";
import type { ComponentType, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ExpenseEditModalProps = {
  open: boolean;
  expense: ExpenseItem | null;
  accounts: ExpenseAccount[];
  onClose: () => void;
  onSubmitUpdate: (payload: UpdateExpenseInput) => void | Promise<void>;
  onSubmitDelete: (payload: DeleteExpenseInput) => void | Promise<void>;
};

const categoryIconMap: Record<ExpenseCategory, ComponentType<{ className?: string }>> = {
  moradia: House,
  alimentacao: ShoppingCart,
  transporte: CarTaxiFront,
  assinaturas: ReceiptText,
  lazer: Popcorn,
  saude: HeartPulse,
  educacao: GraduationCap,
  outros: CircleHelp,
};

const categoryOptionOrder: ExpenseCategory[] = [
  "alimentacao",
  "transporte",
  "saude",
  "outros",
  "moradia",
  "assinaturas",
  "lazer",
  "educacao",
];

const balanceFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getAccountTypeLabel(type: ExpenseAccount["type"]) {
  if (type === "credit") return "Crédito";
  if (type === "debit") return "Débito";
  return "Investimento";
}

export default function ExpenseEditModal({
  open,
  expense,
  accounts,
  onClose,
  onSubmitUpdate,
  onSubmitDelete,
}: ExpenseEditModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const defaultAccountId = accounts[0]?.id ?? "";

  const [status, setStatus] = useState<ExpenseStatus>("pendente");
  const [editScope, setEditScope] = useState<ExpenseEditScope>("item");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("alimentacao");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [dateISO, setDateISO] = useState(getTodayISODate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const mirrorRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydratedExpenseIdRef = useRef<string | null>(null);

  const canEditSeries = Boolean(expense?.seriesId);
  const isBusy = isSubmitting || isDeleting;
  const parsedAmount = parseDecimalValue(amountInput);
  const displayAmount = amountInput || "0,00";

  useEffect(() => {
    if (mirrorRef.current && inputRef.current) {
      inputRef.current.style.width = `${mirrorRef.current.offsetWidth + 2}px`;
    }
  }, [amountInput, displayAmount]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      return;
    }

    if (!accountId || !accounts.some((account) => account.id === accountId)) {
      setAccountId(defaultAccountId);
    }
  }, [accountId, accounts, defaultAccountId, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = useCallback(() => {
    setStatus("pendente");
    setEditScope("item");
    setTitle("");
    setDescription("");
    setAmountInput("");
    setCategory("alimentacao");
    setAccountId(defaultAccountId);
    setDateISO(getTodayISODate());
    setIsHydrating(false);
    setIsStatusSelectOpen(false);
    setIsDeleteConfirmOpen(false);
  }, [defaultAccountId]);

  const handleClose = useCallback(() => {
    if (isBusy) {
      return;
    }

    resetForm();
    onClose();
  }, [isBusy, onClose, resetForm]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      hydratedExpenseIdRef.current = null;
      setIsHydrating(false);
      return;
    }

    if (!expense) {
      setIsHydrating(false);
      return;
    }

    if (hydratedExpenseIdRef.current === expense.id) {
      setIsHydrating(false);
      return;
    }

    setIsHydrating(true);
    setStatus(expense.status);
    setEditScope("item");
    setTitle(expense.merchant);
    setDescription(expense.description);
    setAmountInput(formatAmountFromNumber(expense.amount));
    setCategory(expense.category);
    setAccountId(expense.accountId);
    setDateISO(expense.dateISO);

    hydratedExpenseIdRef.current = expense.id;

    const raf = window.requestAnimationFrame(() => {
      setIsHydrating(false);
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [expense, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDeleteConfirmOpen) {
          setIsDeleteConfirmOpen(false);
          return;
        }

        handleClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose, isDeleteConfirmOpen, open]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accountId, accounts],
  );

  if (!open || !expense) {
    return null;
  }

  const formattedDate = dateISO
    ? new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
    : "Selecionar";

  const sectionReveal = prefersReducedMotion
    ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.16 },
    }
    : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
    };

  const hoverButtonMotion = prefersReducedMotion
    ? {}
    : {
      whileHover: { y: -1, scale: 1.01 },
      whileTap: { scale: 0.985 },
    };

  const cardButtonMotion = prefersReducedMotion
    ? {}
    : {
      whileHover: { y: -2, scale: 1.01 },
      whileTap: { scale: 0.99 },
    };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expense) {
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (normalizedTitle.length < 3) {
      toast.error("Informe um título com pelo menos 3 caracteres.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    if (!dateISO) {
      toast.error("Selecione uma data para continuar.");
      return;
    }

    if (!accountId) {
      toast.error("Selecione uma conta para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const start = performance.now();

      await Promise.resolve(
        onSubmitUpdate({
          targetId: expense.id,
          scope: canEditSeries ? editScope : "item",
          merchant: normalizedTitle,
          description: normalizedDescription,
          amount: parsedAmount,
          category,
          status,
          accountId,
          dateISO,
        }),
      );

      const elapsed = performance.now() - start;
      if (elapsed < 320) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 320 - elapsed);
        });
      }

      setIsSubmitting(false);
      resetForm();
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!expense) {
      return;
    }

    const scope = canEditSeries ? editScope : "item";
    setIsDeleteConfirmOpen(false);
    setIsDeleting(true);

    try {
      const start = performance.now();

      await Promise.resolve(
        onSubmitDelete({
          targetId: expense.id,
          scope,
        }),
      );

      const elapsed = performance.now() - start;
      if (elapsed < 260) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 260 - elapsed);
        });
      }

      setIsDeleting(false);
      resetForm();
      onClose();
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-2 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          !isBusy
          && !isStatusSelectOpen
          && !isDeleteConfirmOpen
          && event.target === event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0.14 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Editar transação"
        className="w-[min(96vw,760px)] max-h-[94dvh] overflow-y-auto rounded-[30px] border border-[#e8e2d6] bg-[#f6f5f3] p-4 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d846b]">
            Editar transação
          </p>
          <motion.button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4dece] bg-white text-[#5f5848] transition hover:bg-[#f6f3ea] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar modal"
            {...hoverButtonMotion}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        {isHydrating ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5">
              <Skeleton className="h-10 w-full rounded-full bg-[#ece7dc]" />
              <Skeleton className="mx-auto mt-5 h-3 w-16 rounded bg-[#ece7dc]" />
              <Skeleton className="mx-auto mt-4 h-16 w-52 rounded-xl bg-[#ece7dc]" />
            </div>

            <div className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5">
              <Skeleton className="h-3 w-24 rounded bg-[#ece7dc]" />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Skeleton className="h-24 rounded-2xl bg-[#ece7dc]" />
                <Skeleton className="h-24 rounded-2xl bg-[#ece7dc]" />
                <Skeleton className="h-24 rounded-2xl bg-[#ece7dc]" />
              </div>
            </div>

            <div className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5">
              <Skeleton className="h-3 w-20 rounded bg-[#ece7dc]" />
              <div className="mt-3 grid grid-cols-4 gap-2">
                <Skeleton className="h-16 rounded-2xl bg-[#ece7dc]" />
                <Skeleton className="h-16 rounded-2xl bg-[#ece7dc]" />
                <Skeleton className="h-16 rounded-2xl bg-[#ece7dc]" />
                <Skeleton className="h-16 rounded-2xl bg-[#ece7dc]" />
              </div>
            </div>

            <div className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5">
              <Skeleton className="h-3 w-36 rounded bg-[#ece7dc]" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-14 rounded-2xl bg-[#ece7dc]" />
                <Skeleton className="h-14 rounded-2xl bg-[#ece7dc]" />
                <Skeleton className="h-14 rounded-2xl bg-[#ece7dc]" />
              </div>
            </div>

            <Skeleton className="h-12 w-full rounded-full bg-[#e3d4a8]" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <motion.section
              className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5"
              {...sectionReveal}
            >
              <div className="inline-flex w-full items-center rounded-full border border-[#ece7dc] bg-[#f8f6f1] p-1">
                <span className="inline-flex h-9 w-full items-center justify-center rounded-full bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#b38c19] shadow-sm">
                  {expense.kind === "income" ? "Receita" : "Despesa"}
                </span>
              </div>

              <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b39b57]/80">
                VALOR
              </p>

              <div className="mt-2 flex justify-center">
                <span
                  ref={mirrorRef}
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none invisible fixed whitespace-pre font-bold tracking-[-0.03em] tabular-nums leading-[1]",
                    getAmountSizeClasses(displayAmount),
                  )}
                >
                  {displayAmount}
                </span>

                <div className="inline-flex items-baseline gap-1">
                  <span className="text-[18px] leading-none font-light text-[#171611]/40 sm:text-[20px]">
                    R$
                  </span>
                  <Input
                    ref={inputRef}
                    value={amountInput}
                    onChange={(event) => setAmountInput(formatAmountInput(event.target.value))}
                    placeholder="0,00"
                    inputMode="decimal"
                    disabled={isBusy}
                    style={{ width: 80 }}
                    className={cn(
                      "h-18 min-w-0 border-0 bg-transparent px-0 text-left leading-[1] font-bold tracking-[-0.03em] tabular-nums text-[#171611] placeholder:text-[#171611]/35 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-70 sm:h-20",
                      getAmountSizeClasses(displayAmount),
                    )}
                    aria-label="Valor da transação"
                  />
                </div>
              </div>
            </motion.section>

            <motion.section
              className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5"
              {...sectionReveal}
            >
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f6855]">
                Selecionar conta
              </p>

              {accounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#ddd8cc] bg-[#fbfaf8] p-4 text-sm text-[#6f6855]">
                  Nenhuma conta ativa encontrada. Cadastre uma conta em Carteira para editar a transação.
                </div>
              ) : (
                <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:justify-center sm:overflow-visible">
                  {accounts.map((account) => {
                    const selected = account.id === accountId;

                    return (
                      <motion.button
                        key={account.id}
                        type="button"
                        onClick={() => setAccountId(account.id)}
                        disabled={isBusy}
                        className={cn(
                          "min-w-[190px] snap-start rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-65 sm:min-w-[210px]",
                          selected
                            ? "border-[#b38c19] bg-[#f4f5f6] text-[#171611] ring-2 ring-[#b38c19]/35 shadow-[0_10px_24px_-14px_rgba(179,140,25,0.55)]"
                            : "border-[#e1ddd2] bg-[#f4f5f6] text-[#171611] hover:bg-[#f0f1f3]",
                        )}
                        aria-label={`Selecionar conta ${account.name}`}
                        {...cardButtonMotion}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "line-clamp-1 text-[10px] uppercase tracking-[0.14em]",
                              selected ? "text-[#a9811a]" : "text-[#8a8068]",
                            )}
                          >
                            {account.name}
                          </p>
                          <span
                            className={cn(
                              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                              selected
                                ? "border-[#d2b975] text-[#d2b975]"
                                : "border-[#b8b2a2] text-transparent",
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-3 text-[10px]",
                            selected ? "text-[#6f6855]" : "text-[#8a8068]",
                          )}
                        >
                          {getAccountTypeLabel(account.type)}
                        </p>
                        <p className="text-lg font-semibold">
                          {balanceFormatter.format(account.availableCents / 100)}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.section>

            <motion.section
              className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5"
              {...sectionReveal}
            >
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f6855]">
                Categoria
              </p>

              <div className="grid grid-cols-4 gap-2">
                {categoryOptionOrder.map((option) => {
                  const Icon = categoryIconMap[option];
                  const selected = option === category;

                  return (
                    <motion.button
                      key={option}
                      type="button"
                      onClick={() => setCategory(option)}
                      disabled={isBusy}
                      className={cn(
                        "rounded-2xl border border-transparent p-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-65",
                        selected
                          ? "bg-[#f5f0e1] text-[#a88118]"
                          : "bg-[#f8f7f4] text-[#7c745f] hover:bg-[#f2f0eb]",
                      )}
                      aria-label={`Selecionar categoria ${expenseCategoryLabels[option]}`}
                      {...cardButtonMotion}
                    >
                      <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e2d5] bg-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="mt-2 block truncate text-[9px] font-semibold uppercase tracking-[0.12em]">
                        {expenseCategoryLabels[option]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5"
              {...sectionReveal}
            >
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f6855]">
                Detalhes da transação
              </p>

              <div className="space-y-2">
                {canEditSeries ? (
                  <div className="rounded-2xl border border-[#efebe2] bg-[#fbfaf8] p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                      Aplicar em
                    </p>
                    <div className="inline-flex w-full items-center rounded-full border border-[#ece7dc] bg-[#f8f6f1] p-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setEditScope("item")}
                        className={cn(
                          "h-8 flex-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60",
                          editScope === "item"
                            ? "bg-white text-[#b38c19] shadow-sm"
                            : "text-[#817861] hover:text-[#5f5848]",
                        )}
                      >
                        Este lançamento
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setEditScope("series")}
                        className={cn(
                          "h-8 flex-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60",
                          editScope === "series"
                            ? "bg-white text-[#b38c19] shadow-sm"
                            : "text-[#817861] hover:text-[#5f5848]",
                        )}
                      >
                        Série inteira
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-[#efebe2] bg-[#fbfaf8] p-3">
                  <label
                    className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]"
                    htmlFor="edit-expense-title"
                  >
                    Título da transação
                  </label>
                  <Input
                    id="edit-expense-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex.: Compra do mês"
                    disabled={isBusy}
                    className="h-9 border-0 bg-transparent px-0 text-sm text-[#171611] placeholder:text-[#a39a83] focus-visible:ring-0"
                  />
                </div>

                <div className="rounded-2xl border border-[#efebe2] bg-[#fbfaf8] p-3">
                  <label
                    className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]"
                    htmlFor="edit-expense-description"
                  >
                    Descrição
                  </label>
                  <Input
                    id="edit-expense-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Ex.: Mercado, limpeza e padaria"
                    disabled={isBusy}
                    className="h-9 border-0 bg-transparent px-0 text-sm text-[#171611] placeholder:text-[#a39a83] focus-visible:ring-0"
                  />
                </div>

                <div className="rounded-2xl border border-[#efebe2] bg-[#fbfaf8] px-3 py-3">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-[#6c6451]">
                    Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ExpenseStatus)}
                    open={isStatusSelectOpen}
                    onOpenChange={setIsStatusSelectOpen}
                  >
                    <SelectTrigger className="h-10 w-full rounded-lg border-[#e2ddcf] bg-white text-[#171611]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[120]" position="popper">
                      <SelectItem value="pago">
                        {expense.kind === "income" ? "Recebido" : expenseStatusLabels.pago}
                      </SelectItem>
                      <SelectItem value="pendente">{expenseStatusLabels.pendente}</SelectItem>
                      <SelectItem value="atrasado">{expenseStatusLabels.atrasado}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#efebe2] bg-[#fbfaf8] px-3 py-3">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#6c6451]">
                    <CalendarRange className="h-4 w-4 text-[#9b927d]" />
                    Data
                  </span>

                  <label className="relative inline-flex items-center gap-2 text-sm font-semibold text-[#a27f1a]">
                    <span>{formattedDate}</span>
                    <Input
                      type="date"
                      value={dateISO}
                      onChange={(event) => setDateISO(event.target.value)}
                      disabled={isBusy}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Selecionar data da transação"
                    />
                  </label>
                </div>
              </div>
            </motion.section>

            <motion.button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={isBusy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
              whileHover={prefersReducedMotion || isBusy ? undefined : { scale: 1.01 }}
              whileTap={prefersReducedMotion || isBusy ? undefined : { scale: 0.985 }}
            >
              {canEditSeries && editScope === "series" ? (
                "Excluir série"
              ) : (
                "Excluir lançamento"
              )}
            </motion.button>

            <motion.button
              type="submit"
              disabled={isBusy || accounts.length === 0 || !selectedAccount}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#b38c19] px-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0px_10px_24px_-10px_rgba(179,140,25,0.75)] transition hover:bg-[#9f7b17] disabled:cursor-not-allowed disabled:opacity-75"
              whileHover={prefersReducedMotion || isBusy ? undefined : { scale: 1.01 }}
              whileTap={prefersReducedMotion || isBusy ? undefined : { scale: 0.985 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar alterações"
              )}
            </motion.button>
          </form>
        )}
      </motion.div>

      {isDeleteConfirmOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4"
          onMouseDown={(event) => {
            if (!isDeleting && event.target === event.currentTarget) {
              setIsDeleteConfirmOpen(false);
            }
          }}
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
            className="w-full max-w-sm rounded-2xl border border-[#e8e2d6] bg-white p-5 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[#171611]">
              Confirmar exclusão
            </p>
            <p className="mt-2 text-sm text-[#6b6453]">
              {canEditSeries && editScope === "series"
                ? "Tem certeza que deseja excluir toda a série desta transação?"
                : "Tem certeza que deseja excluir este lançamento?"}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e3dece] bg-white px-3 text-sm font-medium text-[#5f5848] transition hover:bg-[#f7f4ec] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
