import type {
  CardSummary,
  FinancialHealthMetric,
  KpiCard,
  NavItem,
  PortfolioPoint,
  SpendingCategory,
  Transaction,
} from "@/components/dashboard/types";

export const dashboardNavItems: NavItem[] = [
  { id: "dashboard", label: "Painel", href: "/dashboard", isActive: true },
  { id: "wallet", label: "Carteira", href: "/dashboard?section=wallet" },
  { id: "planner", label: "Planejamento", href: "/dashboard?section=planner" },
  { id: "vault", label: "Cofre", href: "/dashboard?section=vault" },
  {
    id: "settings",
    label: "Configurações",
    href: "/dashboard?section=settings",
  },
];

export const kpiCards: KpiCard[] = [
  {
    id: "net-worth",
    title: "Patrimônio total",
    value: "$1,250,400",
    change: "+5.2%",
    changeLabel: "em relação ao mês passado",
    tone: "positive",
    icon: "bank",
  },
  {
    id: "monthly-spend",
    title: "Gastos do mês",
    value: "$8,430",
    change: "+12%",
    changeLabel: "em relação ao mês passado",
    tone: "warning",
    icon: "wallet",
  },
  {
    id: "savings-rate",
    title: "Taxa de poupança",
    value: "24%",
    change: "-2.1%",
    changeLabel: "meta: 30%",
    tone: "negative",
    icon: "piggy",
  },
];

export const portfolioPoints: PortfolioPoint[] = [
  { label: "Jan", value: 18 },
  { label: "Fev", value: 24 },
  { label: "Mar", value: 34 },
  { label: "Abr", value: 36 },
  { label: "Mai", value: 47 },
  { label: "Jun", value: 51 },
  { label: "Jul", value: 60 },
  { label: "Ago", value: 64 },
  { label: "Set", value: 69 },
];

export const financialHealthScore = 850;
export const financialHealthProgress = 0.85;

export const financialHealthMetrics: FinancialHealthMetric[] = [
  { label: "Uso de crédito", value: "12%" },
  { label: "Hist. de pagamento", value: "100%" },
];

export const spendingCategories: SpendingCategory[] = [
  { id: "dining", label: "Alimentação", percent: 45, color: "#787F5B" },
  { id: "travel", label: "Viagens", percent: 30, color: "#8A816F" },
  { id: "shopping", label: "Compras", percent: 25, color: "#B38C19" },
];

export const activeCards: CardSummary[] = [
  {
    id: "black",
    name: "Aureum Black",
    maskedNumber: "**** 4829",
    usedLabel: "$2,400",
    limitLabel: "$50,000",
    usedPercent: 0.05,
    cardHolder: "Alex Morgan",
    expires: "12/26",
    theme: "dark",
  },
  {
    id: "platinum",
    name: "Aureum Platinum",
    maskedNumber: "**** 8832",
    usedLabel: "$6,030",
    limitLabel: "$25,000",
    usedPercent: 0.24,
    cardHolder: "Alex Morgan",
    expires: "09/25",
    theme: "light",
  },
];

export const recentTransactions: Transaction[] = [
  {
    id: "txn-1",
    merchant: "United Airlines",
    category: "Viagens",
    date: "Hoje, 10:23",
    amount: "-$450.00",
    icon: "plane",
    cardId: "black",
    tag: "viagem",
    ageInMonths: 0,
  },
  {
    id: "txn-2",
    merchant: "Nobu Downtown",
    category: "Alimentação",
    date: "Ontem, 20:45",
    amount: "-$320.50",
    icon: "utensils",
    cardId: "platinum",
    tag: "alimentacao",
    ageInMonths: 0,
  },
  {
    id: "txn-3",
    merchant: "Apple Store",
    category: "Eletrônicos",
    date: "24 out. 2025",
    amount: "-$1,299.00",
    icon: "shopping",
    cardId: "platinum",
    tag: "tecnologia",
    ageInMonths: 4,
  },
  {
    id: "txn-4",
    merchant: "Iberia Airlines",
    category: "Viagens",
    date: "12 jan. 2026",
    amount: "-$780.00",
    icon: "plane",
    cardId: "black",
    tag: "viagem",
    ageInMonths: 2,
  },
];
