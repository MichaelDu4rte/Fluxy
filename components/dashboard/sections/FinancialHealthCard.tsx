import type { FinancialHealthMetric } from "@/components/dashboard/types";
import { Plus } from "lucide-react";

type FinancialHealthCardProps = {
  score: number;
  progress: number;
  metrics: FinancialHealthMetric[];
};

export default function FinancialHealthCard({
  score,
  progress,
  metrics,
}: FinancialHealthCardProps) {
  const radius = 80;
  const halfCircumference = Math.PI * radius;
  const dashLength = Math.max(0, Math.min(1, progress)) * halfCircumference;

  return (
    <article className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] backdrop-blur-[6px]">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#171611]">Saúde financeira</h3>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eee8d9] text-[#b38c19]">
          <Plus className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="h-36 w-full max-w-[240px]" aria-hidden>
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke="#ece9df"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke="#b38c19"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${halfCircumference}`}
          />
          <text x="100" y="88" textAnchor="middle" className="fill-[#171611] text-[44px] font-bold">
            {score}
          </text>
          <text x="100" y="104" textAnchor="middle" className="fill-[#b38c19] text-[13px] font-semibold uppercase tracking-[0.15em]">
            Excelente
          </text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#ece9df] pt-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <p className="text-xs text-[#877e64]">{metric.label}</p>
            <p className="text-sm font-semibold text-[#171611]">{metric.value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
