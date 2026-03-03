export type ApiFinancialAccountType = "credit" | "debit" | "investment";
export type ApiMarketProvider = "coingecko";
export type ApiTransactionKind = "expense" | "income";
export type ApiTransactionStatus = "pago" | "pendente" | "atrasado";
export type ApiTransactionFrequency = "unica" | "recorrente";
export type ApiScope = "item" | "series";
export type ApiKindMode = "todas" | "despesas" | "receitas";

export type InvestmentMetadataDto = {
  provider: ApiMarketProvider;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  entryPriceBrl: number;
};

export type CardMetricsDto = {
  availableCents: number;
  incomeTotalCents: number;
  expenseTotalCents: number;
  creditUsedCents: number;
  utilizationPct: number;
};

export type CardDto = {
  id: string;
  name: string;
  type: ApiFinancialAccountType;
  investment: InvestmentMetadataDto | null;
  last4Digits: string | null;
  creditLimitCents: number | null;
  initialBalanceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metrics: CardMetricsDto;
};

export type TransactionDto = {
  id: string;
  accountId: string;
  kind: ApiTransactionKind;
  status: ApiTransactionStatus;
  frequency: ApiTransactionFrequency;
  category: string;
  merchant: string;
  description: string;
  amountCents: number;
  occurredAt: string;
  seriesId: string | null;
  isInstallment: boolean;
  installmentIndex: number;
  installmentTotal: number;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransactionsSummaryDto = {
  outflowCents: number;
  inflowCents: number;
  netCents: number;
  pendingOpenCents: number;
  totalCount: number;
};

export type CreateCardInput = {
  name: string;
  type: ApiFinancialAccountType;
  investment?: InvestmentMetadataDto | null;
  fundingSourceAccountId?: string | null;
  last4Digits?: string | null;
  creditLimitCents?: number | null;
  initialBalanceCents?: number;
};

export type UpdateCardInput = {
  name?: string;
  type?: ApiFinancialAccountType;
  isActive?: boolean;
  investment?: InvestmentMetadataDto | null;
  last4Digits?: string | null;
  creditLimitCents?: number | null;
  initialBalanceCents?: number;
  adjustmentSourceAccountId?: string | null;
  adjustmentDestinationAccountId?: string | null;
};

export type CreateTransactionInput = {
  accountId: string;
  kind: ApiTransactionKind;
  status: ApiTransactionStatus;
  frequency: ApiTransactionFrequency;
  category: string;
  merchant: string;
  description?: string;
  amountCents: number;
  occurredAt: string;
  isInstallment: boolean;
  installmentTotal: number;
  isRecurring: boolean;
};

export type UpdateTransactionInput = {
  accountId: string;
  status: ApiTransactionStatus;
  category: string;
  merchant: string;
  description?: string;
  amountCents: number;
  occurredAt: string;
};

export type TransactionsFilters = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  accountId?: string;
  status?: "todos" | ApiTransactionStatus;
  frequency?: "todos" | ApiTransactionFrequency;
  kindMode?: ApiKindMode;
};

export type CryptoAssetListItemDto = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  priceBrl: number | null;
  marketCapRank: number | null;
};

export type CryptoQuoteDto = {
  priceBrl: number;
  lastUpdatedAt: string | null;
};

export type CryptoInsightDto = {
  assetId: string;
  priceBrl: number;
  lastUpdatedAt: string | null;
  historicalWindowDays: number;
  positiveReturnProbability: {
    d30Pct: number | null;
    d90Pct: number | null;
    d30Samples: number;
    d90Samples: number;
  };
  inputAmountBrl: number;
  scenarios: {
    d30: {
      variationPct: number;
      projectedValueBrl: number;
      projectedDeltaBrl: number;
    };
    d90: {
      variationPct: number;
      projectedValueBrl: number;
      projectedDeltaBrl: number;
    };
  };
};
