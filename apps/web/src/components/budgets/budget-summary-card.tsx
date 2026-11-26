import type { MonthBudget } from "@wallet/shared";
import { money } from "@/utils/format";

export function BudgetSummaryCard({ data }: { data: MonthBudget }) {
	const { planned, spent, remaining } = data.totals;
	const pct = planned ? Math.min(100, Math.round((spent / planned) * 100)) : 0;
	const paid = data.items.filter(
		(i) => i.status === "paid" || i.status === "over",
	).length;
	return (
		<section
			aria-label="Resumo do mês"
			className="bg-panel border-line flex items-center gap-[18px] rounded-[24px] border p-[18px] md:hidden"
		>
			<div
				className="flex size-[92px] shrink-0 items-center justify-center rounded-full"
				style={{
					background: `conic-gradient(var(--color-money) 0 ${pct * 3.6}deg, var(--color-track) ${pct * 3.6}deg 360deg)`,
				}}
			>
				<div className="bg-panel flex size-[74px] flex-col items-center justify-center rounded-full">
					<span className="num text-[20px] font-bold">{pct}%</span>
					<span className="text-dim text-[11px]">gasto</span>
				</div>
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<span className="text-dim text-[13px]">Falta gastar</span>
				<span className="num truncate text-[24px] leading-[30px] font-bold tracking-[-.02em]">
					{money(remaining)}{" "}
					<span className="text-dim text-sm font-semibold">MZN</span>
				</span>
				<span className="num text-fg-2 text-[13px]">
					{money(spent)} de {money(planned)} · {paid} pagos
				</span>
				<span
					className={`num text-[13px] ${data.totals.leftover < 0 ? "text-warn" : "text-dim"}`}
				>
					sobra do salário {money(data.totals.leftover)}
				</span>
			</div>
		</section>
	);
}
