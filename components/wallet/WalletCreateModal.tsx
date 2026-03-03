"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { parseMoneyToCents } from "@/components/wallet/wallet-helpers";
import type {
  AccountType,
  CardDto,
  CreateCardPayload,
  CryptoAssetListItemDto,
  CryptoInsightDto,
} from "@/components/wallet/types";
import { cn } from "@/lib/utils";
import { CreditCard, Landmark, Loader2, RefreshCcw, Search, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { toast } from "sonner";

type WalletCreateModalProps = {
  open: boolean;
  isSubmitting: boolean;
  fundingSourceAccounts: CardDto[];
  onClose: () => void;
  onSubmit: (payload: CreateCardPayload) => void | Promise<void>;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

function formatCurrencyFromBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyFromCents(value: number) {
  return formatCurrencyFromBrl(value / 100);
}

function formatDateTime(dateIso: string | null) {
  if (!dateIso) {
    return "";
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatProbability(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Dados insuficientes";
  }

  return `${value.toFixed(1)}%`;
}

async function readApiJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const rawText = await response.text();
  const parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;

  if (!response.ok) {
    const apiError = (parsed ?? {}) as ApiErrorResponse;
    throw new Error(apiError.error?.message ?? "Não foi possível carregar dados de mercado.");
  }

  return parsed as T;
}

export default function WalletCreateModal({
  open,
  isSubmitting,
  fundingSourceAccounts,
  onClose,
  onSubmit,
}: WalletCreateModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("credit");
  const [last4Digits, setLast4Digits] = useState("");
  const [creditLimitInput, setCreditLimitInput] = useState("");
  const [initialBalanceInput, setInitialBalanceInput] = useState("");
  const [fundingSourceAccountId, setFundingSourceAccountId] = useState("");

  const [assetQuery, setAssetQuery] = useState("");
  const [assetOptions, setAssetOptions] = useState<CryptoAssetListItemDto[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<CryptoAssetListItemDto | null>(null);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetsReloadKey, setAssetsReloadKey] = useState(0);

  const [insight, setInsight] = useState<CryptoInsightDto | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightReloadKey, setInsightReloadKey] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const previousTypeRef = useRef<AccountType>(type);

  const isCardType = type === "credit" || type === "debit";
  const isInvestment = type === "investment";
  const requiresCreditLimit = type === "credit";
  const previewName = name.trim() || "Novo ativo";
  const previewLast4 = (last4Digits.trim() || "0000").padStart(4, "0");

  const investmentAmountCents = useMemo(
    () => parseMoneyToCents(initialBalanceInput),
    [initialBalanceInput],
  );
  const hasFundingSourceOptions = fundingSourceAccounts.length > 0;
  const selectedFundingSourceAccount = fundingSourceAccounts.find(
    (account) => account.id === fundingSourceAccountId,
  );
  const selectedFundingSourceAvailableCents = Math.max(
    0,
    selectedFundingSourceAccount?.metrics.availableCents ?? 0,
  );

  const currentAssetPriceBrl = insight?.priceBrl ?? selectedAsset?.priceBrl ?? null;
  const probability30Label = formatProbability(insight?.positiveReturnProbability.d30Pct);
  const probability90Label = formatProbability(insight?.positiveReturnProbability.d90Pct);
  const probability30Samples = insight?.positiveReturnProbability.d30Samples ?? 0;
  const probability90Samples = insight?.positiveReturnProbability.d90Samples ?? 0;

  const canSubmit = useMemo(() => {
    if (!name.trim()) {
      return false;
    }

    if (isInvestment) {
      if (!selectedAsset) {
        return false;
      }

      if (Number.isNaN(investmentAmountCents) || investmentAmountCents <= 0) {
        return false;
      }

      if (!hasFundingSourceOptions || !fundingSourceAccountId) {
        return false;
      }

      if (!selectedFundingSourceAccount) {
        return false;
      }

      if (investmentAmountCents > selectedFundingSourceAvailableCents) {
        return false;
      }

      return typeof currentAssetPriceBrl === "number" && currentAssetPriceBrl > 0;
    }

    if (isCardType && !/^\d{4}$/.test(last4Digits.trim())) {
      return false;
    }

    if (Number.isNaN(investmentAmountCents) || investmentAmountCents < 0) {
      return false;
    }

    if (requiresCreditLimit) {
      const creditLimitCents = parseMoneyToCents(creditLimitInput);
      if (Number.isNaN(creditLimitCents) || creditLimitCents <= 0) {
        return false;
      }
    }

    return true;
  }, [
    name,
    isInvestment,
    selectedAsset,
    investmentAmountCents,
    hasFundingSourceOptions,
    fundingSourceAccountId,
    selectedFundingSourceAccount,
    selectedFundingSourceAvailableCents,
    currentAssetPriceBrl,
    isCardType,
    last4Digits,
    requiresCreditLimit,
    creditLimitInput,
  ]);

  function resetForm() {
    setName("");
    setType("credit");
    setLast4Digits("");
    setCreditLimitInput("");
    setInitialBalanceInput("");
    setFundingSourceAccountId("");
    setAssetQuery("");
    setAssetOptions([]);
    setSelectedAsset(null);
    setAssetsError(null);
    setInsight(null);
    setInsightError(null);
    setAssetsReloadKey(0);
    setInsightReloadKey(0);
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        resetForm();
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isSubmitting, onClose]);

  useEffect(() => {
    if (!open || !isInvestment) {
      return;
    }

    if (!hasFundingSourceOptions) {
      if (fundingSourceAccountId) {
        setFundingSourceAccountId("");
      }
      return;
    }

    const isValidSelection = fundingSourceAccounts.some(
      (account) => account.id === fundingSourceAccountId,
    );

    if (!isValidSelection) {
      setFundingSourceAccountId(fundingSourceAccounts[0].id);
    }
  }, [
    open,
    isInvestment,
    hasFundingSourceOptions,
    fundingSourceAccounts,
    fundingSourceAccountId,
  ]);

  useEffect(() => {
    const previousType = previousTypeRef.current;

    if (previousType === "investment" && type !== "investment") {
      setFundingSourceAccountId("");
      setSelectedAsset(null);
      setInsight(null);
      setInsightError(null);
      setAssetQuery("");
      setAssetOptions([]);
      setAssetsError(null);
      setIsAssetsLoading(false);
      setIsInsightLoading(false);
      setAssetsReloadKey(0);
      setInsightReloadKey(0);
    }

    previousTypeRef.current = type;
  }, [type]);

  useEffect(() => {
    if (!open || !isInvestment) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setIsAssetsLoading(true);
      setAssetsError(null);

      try {
        const response = await readApiJson<{ items: CryptoAssetListItemDto[] }>(
          `/api/market/crypto/assets?q=${encodeURIComponent(assetQuery)}&limit=10`,
        );

        if (!active) {
          return;
        }

        setAssetOptions(response.items);
      } catch (error) {
        if (!active) {
          return;
        }

        setAssetsError(error instanceof Error ? error.message : "Falha ao carregar ativos.");
        setAssetOptions([]);
      } finally {
        if (active) {
          setIsAssetsLoading(false);
        }
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, isInvestment, assetQuery, assetsReloadKey]);

  useEffect(() => {
    if (!open || !isInvestment || !selectedAsset) {
      return;
    }

    if (Number.isNaN(investmentAmountCents) || investmentAmountCents <= 0) {
      setInsight(null);
      setInsightError(null);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setIsInsightLoading(true);
      setInsightError(null);

      try {
        const response = await readApiJson<{ insight: CryptoInsightDto }>(
          `/api/market/crypto/insight?assetId=${encodeURIComponent(selectedAsset.id)}&amountCents=${investmentAmountCents}`,
        );

        if (!active) {
          return;
        }

        setInsight(response.insight);
      } catch (error) {
        if (!active) {
          return;
        }

        setInsight(null);
        setInsightError(error instanceof Error ? error.message : "Falha ao carregar projeção.");
      } finally {
        if (active) {
          setIsInsightLoading(false);
        }
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, isInvestment, selectedAsset, investmentAmountCents, insightReloadKey]);

  if (!open) {
    return null;
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Preencha os campos obrigatórios corretamente.");
      return;
    }

    const payload: CreateCardPayload = {
      name: name.trim(),
      type,
      initialBalanceCents: investmentAmountCents,
      investment: null,
      fundingSourceAccountId: null,
      last4Digits: isCardType ? last4Digits.trim() : null,
      creditLimitCents: requiresCreditLimit ? parseMoneyToCents(creditLimitInput) : null,
    };

    if (payload.type === "credit" && (payload.creditLimitCents ?? 0) <= 0) {
      toast.error("Informe um limite de crédito válido.");
      return;
    }

    if (Number.isNaN(payload.initialBalanceCents) || payload.initialBalanceCents < 0) {
      toast.error("Informe um saldo inicial válido.");
      return;
    }

    if (isInvestment) {
      if (!selectedAsset) {
        toast.error("Selecione um ativo cripto.");
        return;
      }

      if (!hasFundingSourceOptions) {
        toast.error("Crie um cartao/conta de credito ou debito para financiar o aporte.");
        return;
      }

      if (!fundingSourceAccountId) {
        toast.error("Selecione a conta/cartao de origem do aporte.");
        return;
      }

      if (!selectedFundingSourceAccount) {
        toast.error("Conta/cartao de origem invalido.");
        return;
      }

      if (investmentAmountCents > selectedFundingSourceAvailableCents) {
        toast.error(
          `Valor acima do disponivel da origem (${formatCurrencyFromCents(selectedFundingSourceAvailableCents)}).`,
        );
        return;
      }

      const entryPriceBrl = currentAssetPriceBrl;
      if (!entryPriceBrl || entryPriceBrl <= 0) {
        toast.error("Não foi possível obter a cotação atual do ativo.");
        return;
      }

      payload.investment = {
        provider: "coingecko",
        assetId: selectedAsset.id,
        assetSymbol: selectedAsset.symbol,
        assetName: selectedAsset.name,
        entryPriceBrl,
      };
      payload.fundingSourceAccountId = fundingSourceAccountId;
    }

    await onSubmit(payload);
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#090909]/40 p-4 backdrop-blur-[2px]"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[30px] border border-[#e8e3d9] bg-[#faf8f3] p-5 shadow-[0px_30px_80px_-24px_rgba(0,0,0,0.35)] sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar conta ou cartão"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171611]">
              Novo ativo da carteira
            </h2>
            <p className="mt-1 text-sm text-[#7b735f]">
              Cadastre um novo ativo com dados reais para acompanhar sua evolução.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e2d6] text-[#6d6553] transition hover:bg-[#f5f2ea] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Fechar modal de criação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-[#ece6db] bg-white p-2 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "credit", label: "Crédito", icon: CreditCard },
                { value: "debit", label: "Débito", icon: Wallet },
                { value: "investment", label: "Investimento", icon: Landmark },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value as AccountType)}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
                    type === value
                      ? "border-[#d9c288] bg-[#f8f1dd] text-[#8b6a13] shadow-sm"
                      : "border-transparent bg-[#f6f3eb] text-[#6f6756] hover:bg-[#f1ebdc]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#2a2a2a] bg-[linear-gradient(115deg,#121212_0%,#1b1b1b_55%,#121212_100%)] p-5 text-white shadow-[0px_16px_46px_-22px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
                {type === "credit" ? "Crédito" : type === "debit" ? "Débito" : "Investimento"}
              </p>
              <CreditCard className="h-5 w-5 text-[#c6b286]" />
            </div>
            <p className="mt-4 text-xl font-semibold tracking-[0.02em]">{previewName}</p>
            {isInvestment ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <p className="text-base text-white/85">
                    {selectedAsset ? `${selectedAsset.name} (${selectedAsset.symbol.toUpperCase()})` : "Selecione um criptoativo"}
                  </p>
                  <p className="mt-1 text-2xl font-light tracking-[0.02em]">
                    {typeof currentAssetPriceBrl === "number"
                      ? formatCurrencyFromBrl(currentAssetPriceBrl)
                      : "Cotação indisponível"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-right text-xs text-white/80">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-white/55">
                    Prob. retorno positivo
                  </p>
                  <p className="mt-1">
                    30d: <span className="font-semibold text-white">{probability30Label}</span>
                  </p>
                  <p>
                    90d: <span className="font-semibold text-white">{probability90Label}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-white/50">
                    amostras: {probability30Samples}/{probability90Samples}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-3xl font-light tracking-[0.16em]">**** {previewLast4}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isInvestment ? "Nome do ativo (ex.: Bitcoin Spot)" : "Nome da conta (ex.: Infinite Reserve)"}
              className="h-11 rounded-xl border-[#e8e2d6] bg-white"
              disabled={isSubmitting}
            />

            {isInvestment ? (
              <Input
                value={initialBalanceInput}
                onChange={(event) => setInitialBalanceInput(event.target.value)}
                placeholder="Valor a investir (R$)"
                className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                disabled={isSubmitting}
              />
            ) : isCardType ? (
              <Input
                value={last4Digits}
                onChange={(event) =>
                  setLast4Digits(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="Últimos 4 dígitos"
                className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                disabled={isSubmitting}
              />
            ) : (
              <div className="hidden sm:block" />
            )}

            {requiresCreditLimit ? (
              <Input
                value={creditLimitInput}
                onChange={(event) => setCreditLimitInput(event.target.value)}
                placeholder="Limite mensal de crédito (R$)"
                className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                disabled={isSubmitting}
              />
            ) : null}

            {!isInvestment ? (
              <Input
                value={initialBalanceInput}
                onChange={(event) => setInitialBalanceInput(event.target.value)}
                placeholder={requiresCreditLimit ? "Saldo para lançamentos (R$)" : "Saldo inicial (R$)"}
                className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                disabled={isSubmitting}
              />
            ) : null}
          </div>

          {isInvestment ? (
            <div className="grid items-start gap-4 xl:grid-cols-12">
              <div className="space-y-4 xl:col-span-7">
                <div className="space-y-3 rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8a816b]">
                      Conta/cartao de origem do aporte
                    </p>
                  </div>

                  {hasFundingSourceOptions ? (
                    <>
                      <Select
                        value={fundingSourceAccountId}
                        onValueChange={setFundingSourceAccountId}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-11 w-full rounded-xl border-[#e8e2d6] bg-white px-3">
                          <SelectValue placeholder="Selecione de onde o valor sera debitado" />
                        </SelectTrigger>
                        <SelectContent>
                          {fundingSourceAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                              {account.last4Digits ? ` • **** ${account.last4Digits}` : ""}
                              {` • Disponivel ${formatCurrencyFromCents(account.metrics.availableCents)}`}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {fundingSourceAccountId ? (
                      <p className="text-xs text-[#7b725d]">
                        Disponivel para aporte: {formatCurrencyFromCents(selectedFundingSourceAvailableCents)}
                      </p>
                    ) : null}

                    {!fundingSourceAccountId && investmentAmountCents > 0 ? (
                      <p className="text-sm text-rose-700">
                        Selecione a conta/cartao de origem para concluir o aporte.
                      </p>
                    ) : null}
                    {fundingSourceAccountId
                    && investmentAmountCents > 0
                    && investmentAmountCents > selectedFundingSourceAvailableCents ? (
                      <p className="text-sm text-rose-700">
                        O valor informado excede o disponivel na conta/cartao selecionado.
                      </p>
                    ) : null}
                  </>
                ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Nao ha contas de credito/debito ativas para financiar o investimento.
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8a816b]">Ativo cripto</p>
                    <button
                      type="button"
                      onClick={() => setAssetsReloadKey((value) => value + 1)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e8e2d6] px-2 text-xs text-[#6d6553] hover:bg-[#f8f4ea]"
                      aria-label="Recarregar lista de ativos"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Atualizar
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b937d]" />
                    <Input
                      value={assetQuery}
                      onChange={(event) => setAssetQuery(event.target.value)}
                      placeholder="Buscar Bitcoin, Ethereum, Solana..."
                      className="h-11 rounded-xl border-[#e8e2d6] bg-white pl-10"
                      disabled={isSubmitting}
                    />
                  </div>

                  {isAssetsLoading ? (
                    <div className="grid gap-2">
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  ) : assetsError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                      {assetsError}
                    </div>
                  ) : (
                    <div className="max-h-[19rem] space-y-2 overflow-auto pr-1">
                      {assetOptions.length === 0 ? (
                        <p className="text-sm text-[#7d735e]">Nenhum ativo encontrado.</p>
                      ) : null}

                      {assetOptions.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => {
                            setSelectedAsset(asset);
                            if (!name.trim()) {
                              setName(asset.name);
                            }
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
                            selectedAsset?.id === asset.id
                              ? "border-[#d9c288] bg-[#f8f1dd]"
                              : "border-[#ece7dd] bg-white hover:bg-[#faf7f0]",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {asset.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset.image} alt={asset.name} className="h-6 w-6 rounded-full" />
                            ) : (
                              <span className="inline-block h-6 w-6 rounded-full bg-[#ece7dd]" />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-[#19160f]">{asset.name}</span>
                              <span className="block text-xs uppercase tracking-[0.08em] text-[#7b725d]">
                                {asset.symbol}
                                {asset.marketCapRank ? ` • Rank #${asset.marketCapRank}` : ""}
                              </span>
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-[#3f3729]">
                            {typeof asset.priceBrl === "number"
                              ? formatCurrencyFromBrl(asset.priceBrl)
                              : "--"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 xl:col-span-5">
                <div className="rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[#8a816b]">Cotação atual</p>
                      <p className="mt-1 text-lg font-semibold text-[#171611]">
                        {typeof currentAssetPriceBrl === "number"
                          ? formatCurrencyFromBrl(currentAssetPriceBrl)
                          : "Selecione um ativo"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[#7f7662]">
                      {insight?.lastUpdatedAt ? `Atualizado em ${formatDateTime(insight.lastUpdatedAt)}` : ""}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[#8a816b]">
                        Cenários históricos (base 6 meses)
                      </p>
                      <p className="mt-1 text-xs text-[#8f856d]">
                        Estimativa baseada no passado, não garantia de retorno futuro.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInsightReloadKey((value) => value + 1)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e8e2d6] px-2 text-xs text-[#6d6553] hover:bg-[#f8f4ea]"
                      aria-label="Recarregar projeções"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Atualizar
                    </button>
                  </div>

                  {!selectedAsset ? (
                    <p className="text-sm text-[#7d735e]">Selecione um ativo para ver projeções.</p>
                  ) : Number.isNaN(investmentAmountCents) || investmentAmountCents <= 0 ? (
                    <p className="text-sm text-[#7d735e]">Informe o valor a investir para calcular projeções.</p>
                  ) : isInsightLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-24 rounded-xl" />
                    </div>
                  ) : insightError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                      {insightError}
                    </div>
                  ) : insight ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#eadfc8] bg-[#fffaf0] p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-[#8f856d]">Cenário 30 dias</p>
                        <p className={cn(
                          "mt-2 text-sm font-semibold",
                          insight.scenarios.d30.variationPct >= 0 ? "text-emerald-700" : "text-rose-700",
                        )}>
                          {formatPercent(insight.scenarios.d30.variationPct)}
                        </p>
                        <p className="mt-1 text-base font-semibold text-[#1e1b13]">
                          {formatCurrencyFromBrl(insight.scenarios.d30.projectedValueBrl)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#eadfc8] bg-[#fffaf0] p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-[#8f856d]">Cenário 90 dias</p>
                        <p className={cn(
                          "mt-2 text-sm font-semibold",
                          insight.scenarios.d90.variationPct >= 0 ? "text-emerald-700" : "text-rose-700",
                        )}>
                          {formatPercent(insight.scenarios.d90.variationPct)}
                        </p>
                        <p className="mt-1 text-base font-semibold text-[#1e1b13]">
                          {formatCurrencyFromBrl(insight.scenarios.d90.projectedValueBrl)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#7d735e]">Sem dados de projeção no momento.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#ece4d3] bg-white/80 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[#8a816b]">
                Dica
              </p>
              <p className="mt-1 text-sm text-[#615948]">
                {requiresCreditLimit
                  ? "Em contas de crédito, o limite mensal define a capacidade principal do ativo."
                  : "Para débito, o saldo inicial será usado como base de disponibilidade."}
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-[#ece4d3] pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-[#e7e2d6] bg-white"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="h-11 rounded-xl bg-[#b38c19] px-6 text-white shadow-[0px_10px_24px_-12px_rgba(179,140,25,0.55)] hover:bg-[#9f7b17]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando
                </span>
              ) : (
                "Adicionar ativo"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

