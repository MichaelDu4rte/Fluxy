export type NavItemId =
  | "dashboard"
  | "expenses"
  | "wallet"
  | "planner"
  | "vault"
  | "settings";

export type NavItem = {
  id: NavItemId;
  label: string;
  href: string;
};

export type KpiTone = "positive" | "warning" | "negative";
export type KpiIcon = "bank" | "wallet" | "piggy";

export type KpiCard = {
  id: string;
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  tone: KpiTone;
  icon: KpiIcon;
};

export type PortfolioPoint = {
  label: string;
  value: number;
};

export type PortfolioChangeTone = "positive" | "negative" | "neutral";

export type PortfolioSummary = {
  periodNetCents: number;
  periodNetLabel: string;
  previousPeriodNetCents: number;
  periodChangePct: number;
  periodChangeLabel: string;
  periodChangeTone: PortfolioChangeTone;
  subtitle: string;
};

export type FinancialHealthMetric = {
  label: string;
  value: string;
};

export type SpendingCategory = {
  id: string;
  label: string;
  percent: number;
  color: string;
};

export type CardTheme = "dark" | "light";

export type CardSummary = {
  id: string;
  name: string;
  maskedNumber: string;
  usedLabel: string;
  limitLabel: string;
  usedPercent: number;
  cardHolder: string;
  expires: string;
  theme: CardTheme;
};

export type WalletAccount = {
  id: "black" | "platinum" | "investment";
  name: string;
  balance: number;
  kindLabel: string;
  accent: "dark" | "light";
};

export type TransactionIcon = "plane" | "utensils" | "shopping";

export type Transaction = {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: string;
  icon: TransactionIcon;
  cardId: string;
  tag: string;
  ageInMonths: number;
};
