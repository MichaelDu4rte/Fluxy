"use client";

import { expenseCategoryLabels } from "@/components/expenses/expense-mock-data";
import {
  formatAmountInput,
  getAmountSizeClasses,
  getTodayISODate,
  parseDecimalValue,
} from "@/components/expenses/modal-helpers";
import type {
  ExpenseAccount,
  ExpenseCategory,
  ExpenseStatus,
  NewExpenseInput,
  TransactionKind,
} from "@/components/expenses/types";
import { Input } from "@/components/ui/input";
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
  CreditCard,
  GraduationCap,
  HeartPulse,
  House,
  Loader2,
  Minus,
  Plus,
  Popcorn,
  ReceiptText,
  ShoppingCart,
  X,
} from "lucide-react";
import type { ComponentType, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ExpenseAddModalProps = {
  open: boolean;
  accounts: ExpenseAccount[];
  onClose: () => void;
  onSubmit: (payload: NewExpenseInput) => void | Promise<void>;
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

export default function ExpenseAddModal({
  open,
  accounts,
  onClose,
  onSubmit,
}: ExpenseAddModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const defaultAccountId = accounts[0]?.id ?? "";

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [status, setStatus] = useState<ExpenseStatus>("pendente");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("alimentacao");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [dateISO, setDateISO] = useState(getTodayISODate());
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentTotal, setInstallmentTotal] = useState(2);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mirrorRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBusy = isSubmitting;
  const parsedAmount = parseDecimalValue(amountInput);
  const displayAmount = amountInput || "0,00";

  useEffect(() => {
    if (mirrorRef.current && inputRef.current) {
      inputRef.current.style.width = `${mirrorRef.current.offsetWidth + 2}px`;
    }
  }, [amountInput, displayAmount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!accountId || !accounts.some((account) => account.id === accountId)) {
      setAccountId(defaultAccountId);
    }
  }, [accountId, accounts, defaultAccountId, open]);

  const formattedDate = dateISO
    ? new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
    : "Selecionar";

  const resetForm = useCallback(() => {
    setKind("expense");
    setStatus("pendente");
    setTitle("");
    setDescription("");
    setAmountInput("");
    setCategory("alimentacao");
    setAccountId(defaultAccountId);
    setDateISO(getTodayISODate());
    setIsInstallment(false);
    setInstallmentTotal(2);
    setIsRecurring(false);
  }, [defaultAccountId]);

  const handleClose = useCallback(() => {
    if (isBusy) {
      return;
    }

    resetForm();
    onClose();
  }, [isBusy, onClose, resetForm]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose, open]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accountId, accounts],
  );

  if (!open) {
    return null;
  }

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

  function toggleInstallment() {
    setIsInstallment((previous) => {
      const nextValue = !previous;

      if (nextValue) {
        setIsRecurring(false);
        setInstallmentTotal((current) => (current < 2 ? 2 : current));
      }

      return nextValue;
    });
  }

  function toggleRecurring() {
    setIsRecurring((previous) => {
      const nextValue = !previous;

      if (nextValue) {
        setIsInstallment(false);
      }

      return nextValue;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        onSubmit({
          kind,
          merchant: normalizedTitle,
          description: normalizedDescription,
          amount: parsedAmount,
          category,
          status,
          type: isRecurring ? "recorrente" : "unica",
          accountId,
          dateISO,
          isInstallment,
          installmentTotal: isInstallment ? installmentTotal : 1,
          isRecurring,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-2 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (!isBusy && event.target === event.currentTarget) {
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
        aria-label="Adicionar transação"
        className="w-[min(96vw,760px)] max-h-[94dvh] overflow-y-auto rounded-[30px] border border-[#e8e2d6] bg-[#f6f5f3] p-4 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d846b]">
            Nova transação
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <motion.section
            className="rounded-3xl border border-[#e8e3da] bg-white p-4 sm:p-5"
            {...sectionReveal}
          >
            <div className="inline-flex w-full items-center rounded-full border border-[#ece7dc] bg-[#f8f6f1] p-1">
              <motion.button
                type="button"
                onClick={() => {
                  setKind("expense");
                  if (status === "pago") {
                    setStatus("pendente");
                  }
                }}
                disabled={isBusy}
                className={cn(
                  "h-9 flex-1 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-60",
                  kind === "expense"
                    ? "bg-white text-[#b38c19] shadow-sm"
                    : "text-[#817861] hover:text-[#5f5848]",
                )}
                aria-label="Selecionar tipo despesa"
                aria-pressed={kind === "expense"}
                {...hoverButtonMotion}
              >
                Despesa
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setKind("income");
                  if (status === "pendente" || status === "atrasado") {
                    setStatus("pago");
                  }
                }}
                disabled={isBusy}
                className={cn(
                  "h-9 flex-1 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-60",
                  kind === "income"
                    ? "bg-white text-[#b38c19] shadow-sm"
                    : "text-[#817861] hover:text-[#5f5848]",
                )}
                aria-label="Selecionar tipo receita"
                aria-pressed={kind === "income"}
                {...hoverButtonMotion}
              >
                Receita
              </motion.button>
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
                Nenhuma conta ativa encontrada. Cadastre uma conta em Carteira para criar transações.
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
              <div className="rounded-2xl border border-[#efebe2] bg-[#fbfaf8] p-3">
                <label
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]"
                  htmlFor="expense-title"
                >
                  Título da transação
                </label>
                <Input
                  id="expense-title"
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
                  htmlFor="expense-description"
                >
                  Descrição
                </label>
                <Input
                  id="expense-description"
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
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-[#e2ddcf] bg-white text-[#171611]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[120]" position="popper">
                    <SelectItem value="pago">
                      {kind === "income" ? "Recebido" : "Pago"}
                    </SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
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

              <div className="flex items-center justify-between rounded-2xl border border-[#efebe2] bg-[#fbfaf8] px-3 py-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#6c6451]">
                  <CreditCard className="h-4 w-4 text-[#9b927d]" />
                  Parcelado
                </span>

                <motion.button
                  type="button"
                  onClick={toggleInstallment}
                  disabled={isBusy}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-60",
                    isInstallment
                      ? "border-[#b38c19] bg-[#efe6ce]"
                      : "border-[#d9d4c8] bg-[#eeece6]",
                  )}
                  aria-pressed={isInstallment}
                  aria-label="Ativar parcelamento"
                  {...hoverButtonMotion}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                      isInstallment ? "translate-x-5" : "translate-x-1",
                    )}
                  />
                </motion.button>
              </div>

              {isInstallment ? (
                <div className="flex items-center justify-between rounded-2xl border border-[#efebe2] bg-[#fbfaf8] px-3 py-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6c6451]">
                    Quantidade
                  </span>

                  <div className="inline-flex items-center gap-1 rounded-full border border-[#e2ddcf] bg-white p-1">
                    <motion.button
                      type="button"
                      onClick={() => setInstallmentTotal((value) => Math.max(2, value - 1))}
                      disabled={isBusy}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#5e5645] hover:bg-[#f4f2ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Diminuir parcelas"
                      {...hoverButtonMotion}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </motion.button>
                    <span className="min-w-[52px] text-center text-sm font-semibold text-[#171611]">
                      {installmentTotal}x
                    </span>
                    <motion.button
                      type="button"
                      onClick={() => setInstallmentTotal((value) => Math.min(24, value + 1))}
                      disabled={isBusy}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#5e5645] hover:bg-[#f4f2ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Aumentar parcelas"
                      {...hoverButtonMotion}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-2xl border border-[#efebe2] bg-[#fbfaf8] px-3 py-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#6c6451]">
                  <ReceiptText className="h-4 w-4 text-[#9b927d]" />
                  Recorrente
                </span>

                <div className="inline-flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a27f1a]">
                    {isRecurring ? "Mensal" : "Não"}
                  </span>
                  <motion.button
                    type="button"
                    onClick={toggleRecurring}
                    disabled={isBusy}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38c19]/60 disabled:cursor-not-allowed disabled:opacity-60",
                      isRecurring
                        ? "border-[#b38c19] bg-[#efe6ce]"
                        : "border-[#d9d4c8] bg-[#eeece6]",
                    )}
                    aria-pressed={isRecurring}
                    aria-label="Ativar recorrência"
                    {...hoverButtonMotion}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                        isRecurring ? "translate-x-5" : "translate-x-1",
                      )}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.section>

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
              "Confirmar transação"
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
