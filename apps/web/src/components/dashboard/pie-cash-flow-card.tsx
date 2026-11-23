import type { Period } from "@/@types/period";
import { useOverview } from "@/actions/analytics/use-overview";
import { SERIES } from "@/components/charts/bar-list";
import { Delta } from "@/components/charts/delta";
import { Donut } from "@/components/charts/donut";
import { Empty } from "@/components/dashboard/empty";
import { Loading } from "@/components/dashboard/loading";
import { PeriodNote } from "@/components/dashboard/period-note";
import { money, signedMoney } from "@/utils/format";

export function PieCashFlowCard({ period }: { period: Period }) {
	const overview = useOverview(period).data;
	if (!overview) return <Loading />;
	if (overview.income === 0 && overview.expense === 0)
		return <Empty>Sem entradas nem saídas neste período.</Empty>;
	const savedShare = overview.income
		? Math.round((overview.net / overview.income) * 100)
		: null;
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span
						className={`num text-[22px] whitespace-nowrap ${overview.net < 0 ? "text-warn" : ""}`}
					>
						{signedMoney(overview.net)}
					</span>
					<span className="text-dim text-xs">
						{savedShare === null
							? "sem entradas"
							: savedShare >= 0
								? `${savedShare}% das entradas ficou`
								: `gastou mais ${money(-overview.net)} do que entrou`}
					</span>
				</div>
				<Delta
					now={overview.net}
					before={overview.previousTotals.net}
					goodWhenUp
				/>
			</div>
			<Donut
				label="Entradas contra saídas"
				centerCaption={overview.net < 0 ? "Faltou" : "Sobrou"}
				centerValue={money(Math.abs(overview.net))}
				slices={[
					{
						key: "income",
						label: "Entradas",
						value: overview.income,
						color: SERIES.income,
						note: `anterior ${money(overview.previousTotals.income)}`,
					},
					{
						key: "expense",
						label: "Saídas",
						value: overview.expense,
						color: SERIES.expense,
						note: `anterior ${money(overview.previousTotals.expense)}`,
					},
				]}
			/>
		</div>
	);
}
