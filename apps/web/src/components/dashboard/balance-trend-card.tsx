import { SERIES } from "@/components/charts/bar-list";
import { Delta } from "@/components/charts/delta";
import { LineChart } from "@/components/charts/line-chart";
import { Loading } from "@/components/dashboard/loading";
import { PeriodNote } from "@/components/dashboard/period-note";
import { type Period, useBalanceTrend } from "@/lib/queries";
import { dayLabel, MONTH_SHORT, money } from "@/utils/format";

export function BalanceTrendCard({ period }: { period: Period }) {
	const points = useBalanceTrend(period).data;
	if (!points) return <Loading />;
	const first = points[0]?.balance ?? 0;
	const last = points.at(-1)?.balance ?? 0;
	const short = (d: string) =>
		`${Number(d.slice(8))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}`;
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col">
					<PeriodNote p={period} />
					<span className="num text-[22px] whitespace-nowrap xl:text-[26px]">
						{money(last)}
					</span>
				</div>
				<Delta now={last} before={first} goodWhenUp />
			</div>
			<LineChart
				area
				label="Saldo total ao longo do período"
				xLabels={points.map((p) => short(p.date))}
				titles={points.map((p) => dayLabel(p.date))}
				series={[
					{
						label: "Saldo",
						color: SERIES.current,
						values: points.map((p) => p.balance),
					},
				]}
			/>
		</div>
	);
}
