"use client";

import { cn } from "@/lib/utils";
import { useFinancePrivacy } from "@/src/contexts/finance-privacy-context";
import type { ReactNode } from "react";

type SensitiveMoneyProps = {
  children: ReactNode;
  className?: string;
};

export default function SensitiveMoney({ children, className }: SensitiveMoneyProps) {
  const { isSensitiveHidden } = useFinancePrivacy();

  return (
    <span
      className={cn(
        "inline-flex items-center transition-[filter] duration-200",
        isSensitiveHidden ? "select-none blur-[6px]" : undefined,
        className,
      )}
    >
      {children}
    </span>
  );
}
