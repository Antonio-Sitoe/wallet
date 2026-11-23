import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@wallet/ui/components/chart";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { SERIES } from "@/components/charts/series";
import { money } from "@/utils/format";

const ROW_HEIGHT = 30;

export function BarList({
	rows,
	label,
}: {
	rows: {
		key: string;
		name: string;
		value: number;
		dot?: string | null;
		note?: string;
	}[];
	label: string;
}) {
	const config: ChartConfig = {
		value: { label: "Total", color: SERIES.magnitude },
	};
	const data = rows.map((r) => ({
		name: r.name,
		value: r.value,
		title: r.note ? `${r.name} · ${r.note}` : r.name,
	}));

	return (
		<ChartContainer
			config={config}
			role="img"
			aria-label={label}
			className="aspect-auto w-full"
			style={{ height: Math.max(ROW_HEIGHT, rows.length * ROW_HEIGHT) }}
		>
			<BarChart
				data={data}
				layout="vertical"
				margin={{ top: 0, right: 88, bottom: 0, left: 0 }}
			>
				<XAxis type="number" hide />
				<YAxis
					type="category"
					dataKey="name"
					tickLine={false}
					axisLine={false}
					width={120}
					tick={{ fill: "var(--color-fg)", fontSize: 13 }}
				/>
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							hideIndicator
							labelFormatter={(_, payload) =>
								String(payload[0]?.payload?.title ?? "")
							}
							valueFormatter={money}
						/>
					}
				/>
				<Bar
					dataKey="value"
					fill="var(--color-value)"
					radius={4}
					barSize={8}
					background={{ fill: "var(--color-hover)", radius: 4 }}
				>
					<LabelList
						dataKey="value"
						position="right"
						offset={12}
						className="num fill-fg"
						fontSize={13}
						formatter={(value) => money(Number(value))}
					/>
				</Bar>
			</BarChart>
		</ChartContainer>
	);
}
