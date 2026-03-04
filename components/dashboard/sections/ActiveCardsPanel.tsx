import SensitiveMoney from "@/components/finance/SensitiveMoney";
import type { CardSummary } from "@/components/dashboard/types";
import { CreditCard } from "lucide-react";

type ActiveCardsPanelProps = {
  cards: CardSummary[];
};

export default function ActiveCardsPanel({ cards }: ActiveCardsPanelProps) {
  return (
    <section className="space-y-4">
      <h3 className="px-1 text-xl font-bold text-[#171611]">Cartões ativos</h3>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative h-full min-h-[220px] overflow-hidden rounded-3xl border border-[#2f2f2f] bg-[radial-gradient(circle_at_82%_12%,rgba(179,140,25,0.18),transparent_42%),linear-gradient(145deg,#121212_0%,#0b0b0b_65%,#090909_100%)] p-5 text-white shadow-[0px_18px_48px_-24px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                  {card.name}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-[0.04em]">
                  {card.maskedNumber}
                </p>
              </div>
              <CreditCard className="h-5 w-5 text-white/70" />
            </div>

            <div className="mt-9 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/65">Limite usado</span>
                <span className="text-white">
                  <SensitiveMoney>{card.usedLabel} / {card.limitLabel}</SensitiveMoney>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/15">
                <div
                  className="h-1.5 rounded-full bg-[#b38c19]"
                  style={{
                    width: `${Math.max(2, Math.round(card.usedPercent * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-end justify-end">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/65">
                  Validade
                </p>
                <p className="text-sm font-medium">{card.expires}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
