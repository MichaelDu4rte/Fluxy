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
import {
  formatMoneyInputFromCents,
  parseMoneyToCents,
} from "@/components/wallet/wallet-helpers";
import type {
  AccountType,
  CardDto,
  CryptoAssetListItemDto,
  CryptoQuoteDto,
  UpdateCardPayload,
} from "@/components/wallet/types";
import { Loader2, RefreshCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { toast } from "sonner";

type WalletEditModalProps = {
  open: boolean;
  card: CardDto | null;
  isSubmitting: boolean;
  fundingSourceAccounts: CardDto[];
  onClose: () => void;
  onSubmit: (payload: UpdateCardPayload) => void | Promise<void>;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type QuoteResponse = {
  quotes: Record<string, CryptoQuoteDto>;
};

type AssetsResponse = {
  items: CryptoAssetListItemDto[];
};

function normalizeAccountType(value: unknown): AccountType {
  if (typeof value !== "string") {
    return "debit";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "credit") {
    return "credit";
  }
  if (normalized === "investment") {
    return "investment";
  }
  return "debit";
}

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

function formatMoneyInputFromBrl(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  return value.toFixed(2).replace(".", ",");
}

async function readApiJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const rawText = await response.text();
  const parsed = rawText ? (JSON.parse(rawText) as unknown) : undefined;

  if (!response.ok) {
    const apiError = (parsed ?? {}) as ApiErrorResponse;
    throw new Error(apiError.error?.message ?? "Nao foi possivel carregar dados.");
  }

  return parsed as T;
}

export default function WalletEditModal({
  open,
  card,
  isSubmitting,
  fundingSourceAccounts,
  onClose,
  onSubmit,
}: WalletEditModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("credit");
  const [isActive, setIsActive] = useState(true);
  const [last4Digits, setLast4Digits] = useState("");
  const [creditLimitInput, setCreditLimitInput] = useState("");
  const [initialBalanceInput, setInitialBalanceInput] = useState("");

  const [assetQuery, setAssetQuery] = useState("");
  const [assetOptions, setAssetOptions] = useState<CryptoAssetListItemDto[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<CryptoAssetListItemDto | null>(null);
  const [entryPriceInput, setEntryPriceInput] = useState("");
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetsReloadKey, setAssetsReloadKey] = useState(0);

  const [quote, setQuote] = useState<CryptoQuoteDto | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteReloadKey, setQuoteReloadKey] = useState(0);

  const [adjustmentSourceAccountId, setAdjustmentSourceAccountId] = useState("");
  const [adjustmentDestinationAccountId, setAdjustmentDestinationAccountId] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const previousTypeRef = useRef<AccountType>(type);

  const normalizedType = normalizeAccountType(type);
  const isInvestment = normalizedType === "investment";
  const isCardType = normalizedType === "credit" || normalizedType === "debit";
  const requiresCreditLimit = normalizedType === "credit";

  const parsedInitialBalanceCents = useMemo(
    () => parseMoneyToCents(initialBalanceInput),
    [initialBalanceInput],
  );
  const parsedCreditLimitCents = useMemo(
    () => parseMoneyToCents(creditLimitInput),
    [creditLimitInput],
  );
  const parsedEntryPriceCents = useMemo(
    () => parseMoneyToCents(entryPriceInput),
    [entryPriceInput],
  );

  const balanceDeltaCents = useMemo(() => {
    if (!card || Number.isNaN(parsedInitialBalanceCents)) {
      return 0;
    }
    return parsedInitialBalanceCents - card.initialBalanceCents;
  }, [card, parsedInitialBalanceCents]);

  const adjustmentAccounts = useMemo(
    () => fundingSourceAccounts.filter((account) => account.id !== card?.id),
    [card?.id, fundingSourceAccounts],
  );
  const selectedAdjustmentSource = adjustmentAccounts.find(
    (account) => account.id === adjustmentSourceAccountId,
  );
  const selectedAdjustmentDestination = adjustmentAccounts.find(
    (account) => account.id === adjustmentDestinationAccountId,
  );
  const selectedAdjustmentSourceAvailableCents = Math.max(
    0,
    selectedAdjustmentSource?.metrics.availableCents ?? 0,
  );

  useEffect(() => {
    if (!open || !card) {
      return;
    }

    setName(card.name);
    const nextType = normalizeAccountType(card.type);
    setType(nextType);
    setIsActive(card.isActive);
    setLast4Digits(card.last4Digits ?? "");
    setCreditLimitInput(
      card.creditLimitCents !== null
        ? formatMoneyInputFromCents(card.creditLimitCents)
        : "",
    );
    setInitialBalanceInput(formatMoneyInputFromCents(card.initialBalanceCents));

    if (card.investment) {
      const hydratedAsset: CryptoAssetListItemDto = {
        id: card.investment.assetId,
        symbol: card.investment.assetSymbol,
        name: card.investment.assetName,
        image: null,
        marketCapRank: null,
        priceBrl: null,
      };
      setSelectedAsset(hydratedAsset);
      setEntryPriceInput(formatMoneyInputFromBrl(card.investment.entryPriceBrl));
      setAssetQuery(card.investment.assetName);
      setAssetOptions([hydratedAsset]);
    } else {
      setSelectedAsset(null);
      setEntryPriceInput("");
      setAssetQuery("");
      setAssetOptions([]);
    }

    setAdjustmentSourceAccountId("");
    setAdjustmentDestinationAccountId("");
    setAssetsError(null);
    setQuote(null);
    setQuoteError(null);
    previousTypeRef.current = nextType;
  }, [card, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  useEffect(() => {
    const previousType = previousTypeRef.current;

    if (previousType === "investment" && type !== "investment") {
      setSelectedAsset(null);
      setEntryPriceInput("");
      setAssetQuery("");
      setAssetOptions([]);
      setAssetsError(null);
      setQuote(null);
      setQuoteError(null);
      setIsAssetsLoading(false);
      setIsQuoteLoading(false);
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
        const response = await readApiJson<AssetsResponse>(
          `/api/market/crypto/assets?q=${encodeURIComponent(assetQuery)}&limit=10`,
        );
        if (active) {
          const withSelected =
            selectedAsset && !response.items.some((item) => item.id === selectedAsset.id)
              ? [selectedAsset, ...response.items]
              : response.items;

          setAssetOptions(withSelected);
        }
      } catch (error) {
        if (active) {
          setAssetsError(error instanceof Error ? error.message : "Falha ao carregar ativos.");
          setAssetOptions(selectedAsset ? [selectedAsset] : []);
        }
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
  }, [open, isInvestment, assetQuery, assetsReloadKey, selectedAsset]);

  useEffect(() => {
    if (!open || !isInvestment || !selectedAsset) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setIsQuoteLoading(true);
      setQuoteError(null);
      try {
        const response = await readApiJson<QuoteResponse>(
          `/api/market/crypto/quotes?ids=${encodeURIComponent(selectedAsset.id)}`,
        );
        if (active) {
          setQuote(response.quotes[selectedAsset.id] ?? null);
        }
      } catch (error) {
        if (active) {
          setQuote(null);
          setQuoteError(error instanceof Error ? error.message : "Falha ao carregar cotacao.");
        }
      } finally {
        if (active) {
          setIsQuoteLoading(false);
        }
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, isInvestment, selectedAsset, quoteReloadKey]);

  useEffect(() => {
    if (balanceDeltaCents > 0) {
      setAdjustmentDestinationAccountId("");
      if (!adjustmentSourceAccountId || !adjustmentAccounts.some((a) => a.id === adjustmentSourceAccountId)) {
        setAdjustmentSourceAccountId(adjustmentAccounts[0]?.id ?? "");
      }
      return;
    }

    if (balanceDeltaCents < 0) {
      setAdjustmentSourceAccountId("");
      if (
        !adjustmentDestinationAccountId
        || !adjustmentAccounts.some((a) => a.id === adjustmentDestinationAccountId)
      ) {
        setAdjustmentDestinationAccountId(adjustmentAccounts[0]?.id ?? "");
      }
      return;
    }

    setAdjustmentSourceAccountId("");
    setAdjustmentDestinationAccountId("");
  }, [
    adjustmentAccounts,
    adjustmentDestinationAccountId,
    adjustmentSourceAccountId,
    balanceDeltaCents,
  ]);

  const currentAssetPriceBrl = quote?.priceBrl ?? selectedAsset?.priceBrl ?? null;

  const canSubmit = useMemo(() => {
    if (!card) {
      return false;
    }
    if (!name.trim()) {
      return false;
    }
    if (Number.isNaN(parsedInitialBalanceCents) || parsedInitialBalanceCents < 0) {
      return false;
    }
    if (isCardType && !/^\d{4}$/.test(last4Digits.trim())) {
      return false;
    }
    if (requiresCreditLimit && (Number.isNaN(parsedCreditLimitCents) || parsedCreditLimitCents <= 0)) {
      return false;
    }
    if (isInvestment) {
      if (!selectedAsset) {
        return false;
      }
      if (Number.isNaN(parsedEntryPriceCents) || parsedEntryPriceCents <= 0) {
        return false;
      }
    }
    if (balanceDeltaCents > 0) {
      if (!selectedAdjustmentSource || !adjustmentSourceAccountId) {
        return false;
      }
      if (balanceDeltaCents > selectedAdjustmentSourceAvailableCents) {
        return false;
      }
    }
    if (balanceDeltaCents < 0 && (!selectedAdjustmentDestination || !adjustmentDestinationAccountId)) {
      return false;
    }
    return true;
  }, [
    adjustmentDestinationAccountId,
    adjustmentSourceAccountId,
    balanceDeltaCents,
    card,
    isCardType,
    isInvestment,
    last4Digits,
    name,
    parsedCreditLimitCents,
    parsedEntryPriceCents,
    parsedInitialBalanceCents,
    requiresCreditLimit,
    selectedAdjustmentDestination,
    selectedAdjustmentSource,
    selectedAdjustmentSourceAvailableCents,
    selectedAsset,
  ]);

  if (!open || !card) {
    return null;
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (isSubmitting) {
      return;
    }
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      toast.error("Preencha os campos obrigatorios corretamente.");
      return;
    }

    const initialBalanceCents = parseMoneyToCents(initialBalanceInput);
    if (Number.isNaN(initialBalanceCents) || initialBalanceCents < 0) {
      toast.error("Informe um saldo inicial valido.");
      return;
    }

    const payload: UpdateCardPayload = {
      name: name.trim(),
      type: normalizedType,
      isActive,
      initialBalanceCents,
    };

    if (isCardType) {
      payload.last4Digits = last4Digits.trim();
    }

    if (requiresCreditLimit) {
      payload.creditLimitCents = parsedCreditLimitCents;
    }

    if (isInvestment && selectedAsset) {
      payload.investment = {
        provider: "coingecko",
        assetId: selectedAsset.id,
        assetSymbol: selectedAsset.symbol,
        assetName: selectedAsset.name,
        entryPriceBrl: parsedEntryPriceCents / 100,
      };
    }

    if (balanceDeltaCents > 0) {
      payload.adjustmentSourceAccountId = adjustmentSourceAccountId;
    }
    if (balanceDeltaCents < 0) {
      payload.adjustmentDestinationAccountId = adjustmentDestinationAccountId;
    }

    await onSubmit(payload);
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#090909]/40 p-4 backdrop-blur-[2px]"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-[#e8e3d9] bg-[#faf8f3] shadow-[0px_30px_80px_-24px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#ece4d3] px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171611]">
              Editar ativo da carteira
            </h2>
            <p className="mt-1 text-sm text-[#7b735f]">
              Edite tipo, status e regras financeiras com clareza.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e2d6] text-[#6d6553] transition hover:bg-[#f5f2ea] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Fechar edicao"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <section className="rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                Dados gerais
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                    Nome
                  </label>
                  <Input
                    ref={titleInputRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nome do ativo"
                    className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                    Tipo
                  </label>
                  <Select
                    value={normalizedType}
                    onValueChange={(value) => setType(normalizeAccountType(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-[#e8e2d6] bg-white px-3">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credito</SelectItem>
                      <SelectItem value="debit">Debito</SelectItem>
                      <SelectItem value="investment">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                    Status
                  </label>
                  <Select
                    value={isActive ? "active" : "inactive"}
                    onValueChange={(value) => setIsActive(value === "active")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-[#e8e2d6] bg-white px-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                Dados financeiros
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {isCardType ? (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                      Ultimos 4 digitos
                    </label>
                    <Input
                      value={last4Digits}
                      onChange={(event) => setLast4Digits(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="0000"
                      className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <div className="hidden lg:block" />
                )}

                {requiresCreditLimit ? (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                      Limite de credito (R$)
                    </label>
                    <Input
                      value={creditLimitInput}
                      onChange={(event) => setCreditLimitInput(event.target.value)}
                      placeholder="0,00"
                      className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  <div className="hidden lg:block" />
                )}

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                    Saldo inicial (R$)
                  </label>
                  <Input
                    value={initialBalanceInput}
                    onChange={(event) => setInitialBalanceInput(event.target.value)}
                    placeholder="0,00"
                    className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </section>

            {isInvestment ? (
              <section className="rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                        Ativo cripto
                      </label>
                      <button
                        type="button"
                        onClick={() => setAssetsReloadKey((value) => value + 1)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e8e2d6] px-2 text-xs text-[#6d6553] hover:bg-[#f8f4ea]"
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
                    <div className="max-h-[15rem] space-y-2 overflow-auto pr-1">
                      {isAssetsLoading ? <p className="text-sm text-[#7d735e]">Carregando ativos...</p> : null}
                      {assetsError ? <p className="text-sm text-rose-700">{assetsError}</p> : null}
                      {!isAssetsLoading && !assetsError && assetOptions.length === 0 ? (
                        <p className="text-sm text-[#7d735e]">Nenhum ativo encontrado.</p>
                      ) : null}
                      {assetOptions.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setSelectedAsset(asset)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                            selectedAsset?.id === asset.id
                              ? "border-[#d9c288] bg-[#f8f1dd]"
                              : "border-[#ece7dd] bg-white hover:bg-[#faf7f0]"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-[#19160f]">{asset.name}</span>
                            <span className="block text-xs uppercase tracking-[0.08em] text-[#7b725d]">{asset.symbol}</span>
                          </span>
                          <span className="text-sm font-semibold text-[#3f3729]">
                            {typeof asset.priceBrl === "number" ? formatCurrencyFromBrl(asset.priceBrl) : "--"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[#efebe2] bg-[#fbfaf8] p-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                        Preco de entrada (R$)
                      </label>
                      <Input
                        value={entryPriceInput}
                        onChange={(event) => setEntryPriceInput(event.target.value)}
                        placeholder="0,00"
                        className="h-11 rounded-xl border-[#e8e2d6] bg-white"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="rounded-xl border border-[#e8e2d6] bg-white p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#8a816b]">Cotacao atual</p>
                        <button
                          type="button"
                          onClick={() => setQuoteReloadKey((value) => value + 1)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e8e2d6] px-2 text-xs text-[#6d6553] hover:bg-[#f8f4ea]"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Atualizar
                        </button>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-[#171611]">
                        {isQuoteLoading
                          ? "Carregando..."
                          : typeof currentAssetPriceBrl === "number"
                          ? formatCurrencyFromBrl(currentAssetPriceBrl)
                          : "Selecione um ativo"}
                      </p>
                      {quoteError ? <p className="mt-1 text-xs text-rose-700">{quoteError}</p> : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {balanceDeltaCents !== 0 ? (
              <section className="rounded-2xl border border-[#ece4d3] bg-white/90 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                  Ajuste financeiro
                </p>
                <p className="mt-1 text-sm text-[#6f6754]">
                  Saldo alterado em{" "}
                  <span className={balanceDeltaCents > 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                    {balanceDeltaCents > 0 ? "+" : "-"}
                    {formatCurrencyFromCents(Math.abs(balanceDeltaCents))}
                  </span>
                  .
                </p>

                {adjustmentAccounts.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Nao existem contas ativas de credito/debito para registrar o ajuste.
                  </div>
                ) : null}

                {balanceDeltaCents > 0 ? (
                  <div className="mt-3 space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                      Conta/cartao de origem do ajuste
                    </label>
                    <Select
                      value={adjustmentSourceAccountId}
                      onValueChange={setAdjustmentSourceAccountId}
                      disabled={isSubmitting || adjustmentAccounts.length === 0}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl border-[#e8e2d6] bg-white px-3">
                        <SelectValue placeholder="Selecione a origem do ajuste" />
                      </SelectTrigger>
                      <SelectContent>
                        {adjustmentAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                            {account.last4Digits ? ` - **** ${account.last4Digits}` : ""}
                            {` - Disponivel ${formatCurrencyFromCents(account.metrics.availableCents)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedAdjustmentSource ? (
                      <p className="text-xs text-[#7b725d]">
                        Disponivel na origem: {formatCurrencyFromCents(selectedAdjustmentSourceAvailableCents)}
                      </p>
                    ) : null}

                    {selectedAdjustmentSource
                    && balanceDeltaCents > selectedAdjustmentSourceAvailableCents ? (
                      <p className="text-sm text-rose-700">
                        O valor do ajuste excede o disponivel na origem selecionada.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {balanceDeltaCents < 0 ? (
                  <div className="mt-3 space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#857c64]">
                      Conta/cartao de destino do ajuste
                    </label>
                    <Select
                      value={adjustmentDestinationAccountId}
                      onValueChange={setAdjustmentDestinationAccountId}
                      disabled={isSubmitting || adjustmentAccounts.length === 0}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl border-[#e8e2d6] bg-white px-3">
                        <SelectValue placeholder="Selecione o destino do ajuste" />
                      </SelectTrigger>
                      <SelectContent>
                        {adjustmentAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                            {account.last4Digits ? ` - **** ${account.last4Digits}` : ""}
                            {` - Disponivel ${formatCurrencyFromCents(account.metrics.availableCents)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#ece4d3] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-[#e7e2d6] bg-white"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="h-11 rounded-xl bg-[#b38c19] px-6 text-white hover:bg-[#9f7b17]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando
                </span>
              ) : (
                "Salvar alteracoes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
