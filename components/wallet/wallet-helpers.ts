import type { AccountType } from "@/components/wallet/types";

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatMoneyInputFromCents(cents: number) {
  const absolute = Math.abs(cents);
  const raw = (absolute / 100).toFixed(2);
  return raw.replace(".", ",");
}

export function parseMoneyToCents(raw: string) {
  const normalized = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  if (!normalized) {
    return 0;
  }

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return Number.NaN;
  }

  return Math.round(value * 100);
}

export function getTypeLabel(type: AccountType) {
  if (type === "credit") return "Crédito";
  if (type === "debit") return "Débito";
  return "Investimento";
}
