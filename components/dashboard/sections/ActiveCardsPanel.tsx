import type { CardSummary } from "@/components/dashboard/types";
import { CreditCard } from "lucide-react";

type ActiveCardsPanelProps = {
  cards: CardSummary[];
};

function getCardSpanClass(index: number, total: number) {
  if (total <= 1) {
    return "md:col-span-12";
  }

  if (total === 2) {
    return "md:col-span-6";
  }

  const remainder = total % 3;

  if (remainder === 1 && index === total - 1) {
    return "md:col-span-12";
  }

  if (remainder === 2 && index >= total - 2) {
    return "md:col-span-6";
  }

  return "md:col-span-4";
}

export default function ActiveCardsPanel({ cards }: ActiveCardsPanelProps) {
  return (
    <section className="space-y-4">
      <h3 className="px-1 text-xl font-bold text-[#171611]">Cartões ativos</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {cards.map((card, index) => {
          const isDark = card.theme === "dark";

          return (
            <article
              key={card.id}
              className={`${getCardSpanClass(index, cards.length)} relative h-full overflow-hidden rounded-3xl border p-5 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] ${
                isDark
                  ? "border-[#3d392f] bg-[radial-gradient(circle_at_80%_10%,rgba(179,140,25,0.25),transparent_40%),linear-gradient(135deg,#1d1a16,#171611_65%)] text-white"
                  : "border-[#f3f4f6] bg-white text-[#171611]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className={`text-xs uppercase tracking-[0.18em] ${
                      isDark ? "text-white/65" : "text-[#877e64]"
                    }`}
                  >
                    {card.name}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-[0.04em]">
                    {card.maskedNumber}
                  </p>
                </div>
                <CreditCard
                  className={`h-5 w-5 ${
                    isDark ? "text-white/70" : "text-[#877e64]"
                  }`}
                />
              </div>

              <div className="mt-9 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? "text-white/65" : "text-[#877e64]"}>
                    Limite usado
                  </span>
                  <span className={isDark ? "text-white" : "text-[#171611]"}>
                    {card.usedLabel} / {card.limitLabel}
                  </span>
                </div>
                <div
                  className={`h-1.5 rounded-full ${
                    isDark ? "bg-white/15" : "bg-[#ece9df]"
                  }`}
                >
                  <div
                    className={`h-1.5 rounded-full ${
                      isDark ? "bg-[#b38c19]" : "bg-[#787f5b]"
                    }`}
                    style={{
                      width: `${Math.max(2, Math.round(card.usedPercent * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p
                    className={`text-[10px] uppercase tracking-[0.18em] ${
                      isDark ? "text-white/65" : "text-[#877e64]"
                    }`}
                  >
                    Titular
                  </p>
                  <p className="text-sm font-medium">{card.cardHolder}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-[10px] uppercase tracking-[0.18em] ${
                      isDark ? "text-white/65" : "text-[#877e64]"
                    }`}
                  >
                    Validade
                  </p>
                  <p className="text-sm font-medium">{card.expires}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
