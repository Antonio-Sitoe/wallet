import { SERIES } from "@/components/charts/bar-list";
import { GroupedBars } from "@/components/charts/grouped-bars";
import { Legend } from "@/components/charts/legend";
import { Loading } from "@/components/dashboard/loading";
import { type Period, useCashflow } from "@/lib/queries";
import { dayLabel, MONTH_SHORT, money, monthLabel } from "@/utils/format";

export function CashFlowTrendCard({ period }: { period: Period }) {
	const trend = useCashflow(period).data;
	if (!trend) return <Loading />;
	const label = (start: string) =>
		trend.bucket === "month"
			? MONTH_SHORT[Number(start.slice(5, 7)) - 1]!
			: `${Number(start.slice(8))} ${MONTH_SHORT[Number(start.slice(5, 7)) - 1]}`;
	const income = trend.points.reduce((s, p) => s + p.income, 0);
	const expense = trend.points.reduce((s, p) => s + p.expense, 0);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="num text-fg-2 text-xs">
					entradas {money(income)} · saídas {money(expense)}
				</span>
				<Legend
					items={[
						{ label: "entradas", color: SERIES.income },
						{ label: "saídas", color: SERIES.expense },
					]}
				/>
			</div>
			<GroupedBars
				label="Entradas e saídas por período"
				series={[
					{ label: "Entradas", color: SERIES.income },
					{ label: "Saídas", color: SERIES.expense },
				]}
				points={trend.points.map((p) => ({
					label: label(p.start),
					title:
						trend.bucket === "month"
							? monthLabel(p.start.slice(0, 7))
							: `${dayLabel(p.start)}${p.end !== p.start ? ` – ${dayLabel(p.end)}` : ""}`,
					values: [p.income, p.expense],
				}))}
			/>
		</div>
	);
}
