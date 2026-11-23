import { SERIES } from "@/components/charts/bar-list";
import { Delta } from "@/components/charts/delta";
import { Loading } from "@/components/dashboard/loading";
import { PeriodNote } from "@/components/dashboard/period-note";
import { type Period, useOverview } from "@/lib/queries";
import { money, signedMoney } from "@/utils/format";

export function CashFlowCard({ period }: { period: Period }) {
	const o = useOverview(period).data;
	if (!o) return <Loading />;
	const max = Math.max(o.income, o.expense, 1);
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span
						className={`num text-[22px] whitespace-nowrap xl:text-[26px] ${o.net < 0 ? "text-warn" : ""}`}
					>
						{signedMoney(o.net)}
					</span>
				</div>
				<Delta now={o.net} before={o.previousTotals.net} goodWhenUp />
			</div>
			{[
				{ label: "Entradas", value: o.income, color: SERIES.income },
				{ label: "Saídas", value: o.expense, color: SERIES.expense },
			].map((r) => (
				<div key={r.label} className="flex flex-col gap-1.5">
					<div className="flex justify-between">
						<span className="text-fg-2">{r.label}</span>
						<span className="num">{money(r.value)}</span>
					</div>
					<span className="bg-hover h-2.5 overflow-hidden rounded-full">
						<span
							className="block h-2.5 rounded-full"
							style={{
								width: `${(r.value / max) * 100}%`,
								background: r.color,
							}}
						/>
					</span>
				</div>
			))}
		</div>
	);
}
