import { SERIES } from "@/components/charts/bar-list";
import { Legend } from "@/components/charts/legend";
import { LineChart } from "@/components/charts/line-chart";
import { Loading } from "@/components/dashboard/loading";
import { type Period, useComparison } from "@/lib/queries";
import { dayLabel, MONTH_SHORT } from "@/utils/format";

export function ComparisonCard({ period }: { period: Period }) {
	const points = useComparison(period).data;
	if (!points) return <Loading />;
	const short = (d: string) =>
		`${Number(d.slice(8))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}`;
	return (
		<div className="flex flex-col gap-3">
			<span className="text-fg-2 text-xs">
				Entradas − saídas, acumulado desde o início de cada período
			</span>
			<LineChart
				label="Fluxo acumulado: este período, o anterior e há um ano"
				xLabels={points.map((p) => short(p.date))}
				titles={points.map((p) => `dia ${p.day} · ${dayLabel(p.date)}`)}
				series={[
					{
						label: "Este período",
						color: SERIES.current,
						values: points.map((p) => p.current),
					},
					{
						label: "Período anterior",
						color: SERIES.previous,
						values: points.map((p) => p.previous),
					},
					{
						label: "Há um ano",
						color: SERIES.yearAgo,
						values: points.map((p) => p.yearAgo),
					},
				]}
			/>
			<Legend
				items={[
					{ label: "este período", color: SERIES.current, line: true },
					{ label: "período anterior", color: SERIES.previous, line: true },
					{ label: "há um ano", color: SERIES.yearAgo, line: true },
				]}
			/>
		</div>
	);
}
