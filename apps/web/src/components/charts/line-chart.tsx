import { useId, useMemo, useRef, useState } from "react";
import { Tooltip } from "@/components/charts/tooltip";
import {
	AXIS_TEXT,
	compact,
	GRID,
	niceTicks,
	useWidth,
} from "@/components/charts/utils";
import { money } from "@/utils/format";

export function LineChart({
	xLabels,
	titles,
	series,
	height = 220,
	area,
	label,
}: {
	xLabels: string[];
	titles: string[];
	series: { label: string; color: string; values: (number | null)[] }[];
	height?: number;
	area?: boolean;
	label: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const gradient = useId();
	const [hover, setHover] = useState<{
		i: number;
		x: number;
		y: number;
	} | null>(null);
	const width = useWidth(ref);
	const pad = { l: 48, r: 10, t: 10, b: 24 };
	const all = series.flatMap((s) =>
		s.values.filter((v): v is number => v !== null),
	);
	const ticks = niceTicks(Math.min(0, ...all), Math.max(1, ...all));
	const lo = ticks[0] ?? 0;
	const hi = ticks.at(-1) ?? 1;
	const plotW = width - pad.l - pad.r;
	const plotH = height - pad.t - pad.b;
	const n = Math.max(xLabels.length, 1);
	const x = (i: number) =>
		pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
	const y = (v: number) => pad.t + plotH - ((v - lo) / (hi - lo)) * plotH;
	const every = Math.ceil(n / Math.max(2, Math.min(8, Math.floor(plotW / 56))));

	const paths = useMemo(
		() =>
			series.map((s) => {
				let d = "";
				let pen = false;
				s.values.forEach((v, i) => {
					if (v === null) {
						pen = false;
						return;
					}
					d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
					pen = true;
				});
				return d;
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[series, lo, hi, n],
	);

	return (
		<div
			ref={ref}
			className="relative"
			onPointerLeave={() => setHover(null)}
			onPointerMove={(e) => {
				const box = ref.current?.getBoundingClientRect();
				if (!box) return;
				const sx = ((e.clientX - box.left) / box.width) * width;
				const i = Math.round(((sx - pad.l) / plotW) * (n - 1));
				if (i < 0 || i >= n) return setHover(null);
				setHover({ i, x: e.clientX - box.left, y: e.clientY - box.top });
			}}
		>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="h-auto w-full"
				role="img"
				aria-label={label}
			>
				{area ? (
					<defs>
						<linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
							<stop
								offset="0"
								stopColor={series[0]?.color}
								stopOpacity="0.25"
							/>
							<stop offset="1" stopColor={series[0]?.color} stopOpacity="0" />
						</linearGradient>
					</defs>
				) : null}
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
				{xLabels.map((l, i) =>
					(i % every === 0 && n - 1 - i >= every / 2) || i === n - 1 ? (
						<text
							key={titles[i] ?? l}
							x={x(i)}
							y={height - 6}
							textAnchor={i === n - 1 ? "end" : "middle"}
							fontSize="10"
							fill={AXIS_TEXT}
							className="num"
						>
							{l}
						</text>
					) : null,
				)}
				{area && paths[0] ? (
					<path
						d={`${paths[0]} L${x(n - 1)},${y(lo)} L${x(0)},${y(lo)} Z`}
						fill={`url(#${gradient})`}
					/>
				) : null}
				{series.map((s, k) => (
					<path
						key={s.label}
						d={paths[k]}
						fill="none"
						stroke={s.color}
						strokeWidth="2"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				))}
				{hover ? (
					<g>
						<line
							x1={x(hover.i)}
							x2={x(hover.i)}
							y1={pad.t}
							y2={pad.t + plotH}
							stroke="#484f58"
						/>
						{series.map((s) => {
							const v = s.values[hover.i];
							return v === null || v === undefined ? null : (
								<circle
									key={s.label}
									cx={x(hover.i)}
									cy={y(v)}
									r="4"
									fill={s.color}
									stroke="#0f1216"
									strokeWidth="2"
								/>
							);
						})}
					</g>
				) : null}
			</svg>
			<Tooltip
				width={ref.current?.clientWidth ?? width}
				tip={
					hover
						? {
								x: hover.x,
								y: hover.y,
								title: titles[hover.i] ?? "",
								rows: series.map((s) => ({
									label: s.label,
									value:
										s.values[hover.i] === null
											? "—"
											: money(s.values[hover.i] ?? 0),
									color: s.color,
									line: true,
								})),
							}
						: null
				}
			/>
		</div>
	);
}
