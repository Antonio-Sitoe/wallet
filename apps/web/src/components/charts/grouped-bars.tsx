import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@wallet/ui/components/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { compact, money } from "@/utils/format";

export function GroupedBars({
	points,
	series,
	height = 220,
	legend,
	label,
}: {
	points: { label: string; title: string; values: number[] }[];
	series: { label: string; color: string }[];
	height?: number;
	legend?: boolean;
	label: string;
}) {
	const keyOf = (index: number) => `s${index}`;
	const config: ChartConfig = Object.fromEntries(
		series.map((s, i) => [keyOf(i), { label: s.label, color: s.color }]),
	);
	const data = points.map((p) => ({
		x: p.label,
		title: p.title,
		...Object.fromEntries(series.map((_, j) => [keyOf(j), p.values[j] ?? 0])),
	}));

	return (
		<ChartContainer
			config={config}
			role="img"
			aria-label={label}
			className="aspect-auto w-full"
			style={{ height }}
		>
			<BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="x"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={12}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					width={44}
					tickFormatter={compact}
				/>
				<ChartTooltip
					content={
						<ChartTooltipContent
							labelFormatter={(_, payload) =>
								String(payload[0]?.payload?.title ?? "")
							}
							valueFormatter={money}
						/>
					}
				/>
				{series.map((_, i) => (
					<Bar
						key={keyOf(i)}
						dataKey={keyOf(i)}
						fill={`var(--color-${keyOf(i)})`}
						radius={[3, 3, 0, 0]}
						maxBarSize={18}
					/>
				))}
				{legend ? <ChartLegend content={<ChartLegendContent />} /> : null}
			</BarChart>
		</ChartContainer>
	);
}
