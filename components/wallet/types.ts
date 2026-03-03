export type AccountType = "credit" | "debit" | "investment";
export type MarketProvider = "coingecko";

export type CardInvestmentMetadata = {
  provider: MarketProvider;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  entryPriceBrl: number;
};

export type CardDto = {
  id: string;
  name: string;
  type: AccountType;
  investment: CardInvestmentMetadata | null;
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

export type UpdateCardPayload = {
  name?: string;
  type?: AccountType;
  isActive?: boolean;
  investment?: CardInvestmentMetadata | null;
  last4Digits?: string | null;
  creditLimitCents?: number | null;
  initialBalanceCents?: number;
  adjustmentSourceAccountId?: string | null;
  adjustmentDestinationAccountId?: string | null;
};

export type CreateCardPayload = {
  name: string;
  type: AccountType;
  investment?: CardInvestmentMetadata | null;
  fundingSourceAccountId?: string | null;
  last4Digits?: string | null;
  creditLimitCents?: number | null;
  initialBalanceCents: number;
};

export type TransactionKind = "expense" | "income";
export type TransactionStatus = "pago" | "pendente" | "atrasado";

export type TransactionDto = {
  id: string;
  accountId: string;
  kind: TransactionKind;
  status: TransactionStatus;
  category: string;
  merchant: string;
  amountCents: number;
  occurredAt: string;
};

export type WalletSortMode =
  | "allocation-desc"
  | "aum-desc"
  | "return-desc"
  | "name-asc";

export type WalletPortfolioSummaryVm = {
  totalPortfolioCents: number;
  totalPortfolioLabel: string;
  monthChangePct: number;
  monthChangeLabel: string;
  efficiencyPct: number;
  liquidityPct: number;
};

export type WalletPerformanceRowVm = {
  accountId: string;
  accountName: string;
  typeLabel: string;
  last4DigitsLabel: string;
  availableBalanceCents: number;
  availableBalanceLabel: string;
  spentCents: number;
  spentLabel: string;
  monthlyLimitCents: number;
  monthlyLimitLabel: string;
  utilizationPct: number;
  utilizationLabel: string;
  statusLabel: string;
};

export type WalletHoldingRisk = "conservative" | "moderate";

export type WalletHoldingVm = {
  accountId: string;
  accountName: string;
  type: AccountType;
  aumCents: number;
  aumLabel: string;
  allocationPct: number;
  allocationLabel: string;
  returnPct: number;
  returnLabel: string;
  risk: WalletHoldingRisk;
  riskLabel: string;
  horizonLabel: string;
  marketAssetLabel?: string | null;
  entryPriceLabel?: string | null;
  currentPriceLabel?: string | null;
  marketUpdatedAtLabel?: string | null;
};

export type CryptoAssetListItemDto = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  priceBrl: number | null;
  marketCapRank: number | null;
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

export type CryptoQuoteDto = {
  priceBrl: number;
  lastUpdatedAt: string | null;
};
