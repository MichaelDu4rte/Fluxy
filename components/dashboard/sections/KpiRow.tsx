import SensitiveMoney from "@/components/finance/SensitiveMoney";
import type { KpiCard, KpiTone } from "@/components/dashboard/types";
import { Landmark, PiggyBank, Wallet } from "lucide-react";

type KpiRowProps = {
  cards: KpiCard[];
};

const iconMap = {
  bank: Landmark,
  wallet: Wallet,
  piggy: PiggyBank,
};

const toneClasses: Record<KpiTone, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  negative: "bg-rose-100 text-rose-700",
};

export default function KpiRow({ cards }: KpiRowProps) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = iconMap[card.icon];

        return (
          <article
            key={card.id}
            className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-5 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] backdrop-blur-[6px]"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#877e64]">{card.title}</p>
              <p className="text-3xl font-bold tracking-[-0.02em] text-[#171611]">
                <SensitiveMoney>{card.value}</SensitiveMoney>
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClasses[card.tone]}`}
              >
                {card.change}
              </span>
              <span className="text-xs text-[#877e64]">{card.changeLabel}</span>
            </div>

            <div className="absolute right-4 top-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f2e9] text-[#b38c19]">
              <Icon className="h-5 w-5" />
            </div>
          </article>
        );
      })}
    </section>
  );
}
