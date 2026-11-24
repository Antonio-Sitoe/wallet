import type { Period } from "@/@types/period";
import { useComparison } from "@/actions/analytics/use-comparison";
import { LineChart } from "@/components/charts/line-chart";
import { SERIES } from "@/components/charts/series";
import { Loading } from "@/components/dashboard/loading";
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
				legend
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
		</div>
	);
}
