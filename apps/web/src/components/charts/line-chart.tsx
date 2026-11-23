import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@wallet/ui/components/chart";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	LineChart as LineChartRoot,
	XAxis,
	YAxis,
} from "recharts";
import { compact, money } from "@/utils/format";

type Row = Record<string, string | number | null>;

export function LineChart({
	xLabels,
	titles,
	series,
	height = 220,
	area,
	legend,
	label,
}: {
	xLabels: string[];
	titles: string[];
	series: { label: string; color: string; values: (number | null)[] }[];
	height?: number;
	area?: boolean;
	legend?: boolean;
	label: string;
}) {
	const keyOf = (index: number) => `s${index}`;
	const config: ChartConfig = Object.fromEntries(
		series.map((s, i) => [keyOf(i), { label: s.label, color: s.color }]),
	);
	const data: Row[] = xLabels.map((x, i) => ({
		x,
		title: titles[i] ?? x,
		...Object.fromEntries(
			series.map((s, j) => [keyOf(j), s.values[i] ?? null]),
		),
	}));
	const Root = area ? AreaChart : LineChartRoot;

	return (
		<ChartContainer
			config={config}
			role="img"
			aria-label={label}
			className="aspect-auto w-full"
			style={{ height }}
		>
			<Root data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="x"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					minTickGap={24}
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
							indicator="line"
							labelFormatter={(_, payload) =>
								String(payload[0]?.payload?.title ?? "")
							}
							valueFormatter={money}
						/>
					}
				/>
				{series.map((_, i) =>
					area ? (
						<Area
							key={keyOf(i)}
							dataKey={keyOf(i)}
							type="monotone"
							stroke={`var(--color-${keyOf(i)})`}
							fill={`var(--color-${keyOf(i)})`}
							fillOpacity={0.15}
							strokeWidth={2}
							dot={false}
						/>
					) : (
						<Line
							key={keyOf(i)}
							dataKey={keyOf(i)}
							type="monotone"
							stroke={`var(--color-${keyOf(i)})`}
							strokeWidth={2}
							dot={false}
						/>
					),
				)}
				{legend ? <ChartLegend content={<ChartLegendContent />} /> : null}
			</Root>
		</ChartContainer>
	);
}
