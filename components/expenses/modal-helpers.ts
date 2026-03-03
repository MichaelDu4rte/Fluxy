export function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDecimalValue(rawValue: string) {
  const cleaned = rawValue
    .replace(/\s+/g, "")
    .replace(/R\$/gi, "")
    .replace(/[^0-9,.-]/g, "");

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\./g, "");

  return Number.parseFloat(normalized);
}

export function formatAmountInput(rawValue: string) {
  const sanitized = rawValue.replace(/[^\d,]/g, "");

  if (!sanitized) {
    return "";
  }

  const [integerPartRaw, decimalPartRaw = ""] = sanitized.split(",");
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "") || "0";
  const integerFormatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (sanitized.includes(",")) {
    return `${integerFormatted},${decimalPartRaw.slice(0, 2)}`;
  }

  return integerFormatted;
}

export function formatAmountFromNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getAmountSizeClasses(value: string) {
  const length = value.length;

  if (length <= 7) {
    return "text-[48px] sm:text-[56px] md:text-[60px]";
  }

  if (length <= 10) {
    return "text-[40px] sm:text-[48px] md:text-[52px]";
  }

  if (length <= 13) {
    return "text-[34px] sm:text-[40px] md:text-[44px]";
  }

  return "text-[30px] sm:text-[34px] md:text-[38px]";
}
