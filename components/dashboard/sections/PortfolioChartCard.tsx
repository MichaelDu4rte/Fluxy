import SensitiveMoney from "@/components/finance/SensitiveMoney";
import type { PortfolioPoint, PortfolioSummary } from "@/components/dashboard/types";

type PortfolioChartCardProps = {
  points: PortfolioPoint[];
  summary: PortfolioSummary;
};

export default function PortfolioChartCard({ points, summary }: PortfolioChartCardProps) {
  const safePoints = points.length > 0 ? points : [{ label: "--", value: 0 }];
  const width = 720;
  const height = 260;
  const xPadding = 8;
  const yPadding = 14;

  const minValue = Math.min(...safePoints.map((point) => point.value));
  const maxValue = Math.max(...safePoints.map((point) => point.value));
  const spread = maxValue - minValue || 1;
  const horizontalSteps = Math.max(1, safePoints.length - 1);

  const coordinates = safePoints.map((point, index) => {
    const x = xPadding + (index * (width - xPadding * 2)) / horizontalSteps;
    const y =
      height -
      yPadding -
      ((point.value - minValue) / spread) * (height - yPadding * 2);

    return { x, y, label: point.label };
  });

  const linePath = coordinates
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x} ${coord.y}`)
    .join(" ");

  const areaPath = `${linePath} L${coordinates[coordinates.length - 1].x} ${height - yPadding} L${coordinates[0].x} ${height - yPadding} Z`;

  const metricToneClass =
    summary.periodChangeTone === "negative"
      ? "text-rose-700"
      : summary.periodChangeTone === "neutral"
        ? "text-[#7f7761]"
        : "text-[#b38c19]";

  const changeToneClass =
    summary.periodChangeTone === "negative"
      ? "bg-rose-100 text-rose-700"
      : summary.periodChangeTone === "neutral"
        ? "bg-stone-200 text-stone-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <article className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] backdrop-blur-[6px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[#171611]">Crescimento do portfolio</h3>
          <p className="text-sm text-[#877e64]">{summary.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${metricToneClass}`}>
            <SensitiveMoney>{summary.periodNetLabel}</SensitiveMoney>
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${changeToneClass}`}>
            {summary.periodChangeLabel}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" aria-hidden>
          <defs>
            <linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b38c19" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#b38c19" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={xPadding}
              y1={height * ratio}
              x2={width - xPadding}
              y2={height * ratio}
              stroke="#e5e1d8"
              strokeDasharray="4 6"
            />
          ))}

          <path d={areaPath} fill="url(#portfolioArea)" />
          <path d={linePath} fill="none" stroke="#b38c19" strokeWidth="3" strokeLinecap="round" />

          <circle
            cx={coordinates[coordinates.length - 1].x}
            cy={coordinates[coordinates.length - 1].y}
            r="5"
            fill="#b38c19"
          />
          <circle
            cx={coordinates[coordinates.length - 1].x}
            cy={coordinates[coordinates.length - 1].y}
            r="8"
            fill="none"
            stroke="#b38c19"
            strokeOpacity="0.25"
          />
        </svg>

        <div
          className="mt-2 grid text-center text-[11px] font-medium uppercase tracking-wide text-[#877e64]"
          style={{ gridTemplateColumns: `repeat(${safePoints.length}, minmax(0, 1fr))` }}
        >
          {safePoints.map((point, index) => (
            <span key={`${point.label}-${index}`}>{point.label}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
