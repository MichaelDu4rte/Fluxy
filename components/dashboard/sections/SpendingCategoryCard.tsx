import type { SpendingCategory } from "@/components/dashboard/types";

type SpendingCategoryCardProps = {
  categories: SpendingCategory[];
  totalLabel: string;
};

export default function SpendingCategoryCard({
  categories,
  totalLabel,
}: SpendingCategoryCardProps) {
  const gradientStops = categories.reduce(
    (acc, category) => {
      const start = acc.current;
      const end = start + category.percent;

      return {
        current: end,
        stops: [...acc.stops, `${category.color} ${start}% ${end}%`],
      };
    },
    { current: 0, stops: [] as string[] },
  ).stops;

  return (
    <article className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-[0px_4px_20px_-2px_rgba(179,140,25,0.1),0px_2px_6px_-2px_rgba(0,0,0,0.05)] backdrop-blur-[6px]">
      <h3 className="text-xl font-bold text-[#171611]">Categoria de gastos</h3>

      <div className="mt-6 flex justify-center">
        <div
          className="relative flex h-44 w-44 items-center justify-center rounded-full"
          style={{ backgroundImage: `conic-gradient(${gradientStops.join(", ")})` }}
        >
          <div className="flex h-[116px] w-[116px] flex-col items-center justify-center rounded-full bg-[#f8f7f3]">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#877e64]">Total</span>
            <span className="text-3xl font-bold tracking-[-0.03em] text-[#171611]">{totalLabel}</span>
          </div>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#171611]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span>{category.label}</span>
            </div>
            <span className="font-semibold text-[#171611]">{category.percent}%</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
