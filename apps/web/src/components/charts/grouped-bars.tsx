import { useRef, useState } from "react";
import { Tooltip } from "@/components/charts/tooltip";
import {
	AXIS_TEXT,
	compact,
	GRID,
	niceTicks,
	type Tip,
	useWidth,
} from "@/components/charts/utils";
import { money } from "@/utils/format";

export function GroupedBars({
	points,
	series,
	height = 220,
	label,
}: {
	points: { label: string; title: string; values: number[] }[];
	series: { label: string; color: string }[];
	height?: number;
	label: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [tip, setTip] = useState<Tip | null>(null);
	const width = useWidth(ref);
	const pad = { l: 44, r: 8, t: 8, b: 24 };
	const max = Math.max(1, ...points.flatMap((p) => p.values));
	const ticks = niceTicks(0, max);
	const top = ticks.at(-1) ?? max;
	const plotW = width - pad.l - pad.r;
	const plotH = height - pad.t - pad.b;
	const band = plotW / Math.max(points.length, 1);
	const gap = 2;
	const barW = Math.max(2, Math.min(18, (band * 0.7 - gap) / series.length));
	const y = (v: number) => pad.t + plotH - (v / top) * plotH;
	const every = Math.ceil(
		points.length / Math.max(2, Math.min(12, Math.floor(plotW / 36))),
	);

	return (
		<div ref={ref} className="relative" onPointerLeave={() => setTip(null)}>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="h-auto w-full"
				role="img"
				aria-label={label}
			>
				{ticks.map((t) => (
					<g key={t}>
						<line
							x1={pad.l}
							x2={width - pad.r}
							y1={y(t)}
							y2={y(t)}
							stroke={GRID}
							strokeDasharray={t === 0 ? undefined : "3 4"}
						/>
						<text
							x={pad.l - 6}
							y={y(t) + 3}
							textAnchor="end"
							fontSize="10"
							fill={AXIS_TEXT}
							className="num"
						>
							{compact(t)}
						</text>
					</g>
				))}
				{points.map((p, i) => {
					const cx = pad.l + band * i + band / 2;
					const groupW = series.length * barW + (series.length - 1) * gap;
					return (
						<g key={p.title}>
							{p.values.map((v, s) => {
								const x = cx - groupW / 2 + s * (barW + gap);
								const h = Math.max(0, y(0) - y(v));
								const r = Math.min(4, barW / 2, h);
								return (
									<path
										key={series[s]!.label}
										d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barW - r} Q${x + barW},${y(0) - h} ${x + barW},${y(0) - h + r} V${y(0)} Z`}
										fill={series[s]!.color}
									/>
								);
							})}
							{i % every === 0 ? (
								<text
									x={cx}
									y={height - 6}
									textAnchor="middle"
									fontSize="10"
									fill={AXIS_TEXT}
									className="num"
								>
									{p.label}
								</text>
							) : null}
							<rect
								x={pad.l + band * i}
								y={pad.t}
								width={band}
								height={plotH}
								fill="transparent"
								onPointerMove={(e) => {
									const box = ref.current?.getBoundingClientRect();
									if (!box) return;
									setTip({
										x: e.clientX - box.left,
										y: e.clientY - box.top,
										title: p.title,
										rows: series.map((s, k) => ({
											label: s.label,
											value: money(p.values[k] ?? 0),
											color: s.color,
										})),
									});
								}}
							/>
						</g>
					);
				})}
			</svg>
			<Tooltip tip={tip} width={ref.current?.clientWidth ?? width} />
		</div>
	);
}
