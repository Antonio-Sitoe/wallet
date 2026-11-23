/**
 * Small SVG charts for the dashboard. Colours were checked with the dataviz validator on the dark panel
 * (#0F1216): income/expense aqua + orange, comparison lines blue + orange + violet (all pass CVD checks).
 * Every chart has a hover tooltip; values in text use text colours, the coloured mark carries identity.
 */
import { useId, useMemo, useRef, useState } from "react";

import { money } from "@/lib/format";

export const SERIES = {
	income: "#199e70",
	expense: "#d95926",
	current: "#3987e5",
	previous: "#d95926",
	yearAgo: "#9085e9",
	magnitude: "#3987e5",
} as const;

const GRID = "#1f242b";
const AXIS_TEXT = "#8b949e";

/** "12 500 000" → "125k" for axis ticks (values are centavos). */
export function compact(cents: number) {
	const mzn = cents / 100;
	const abs = Math.abs(mzn);
	if (abs >= 1_000_000)
		return `${(mzn / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
	if (abs >= 1_000) return `${Math.round(mzn / 1_000)}k`;
	return String(Math.round(mzn));
}

function niceTicks(min: number, rawMax: number, count = 4) {
	const max = min === rawMax ? min + 1 : rawMax;
	const span = max - min;
	const step0 = span / count;
	const mag = 10 ** Math.floor(Math.log10(step0));
	const step =
		[1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
	const lo = Math.floor(min / step) * step;
	const hi = Math.ceil(max / step) * step;
	const ticks: number[] = [];
	for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
	return ticks;
}

export function Legend({
	items,
}: {
	items: { label: string; color: string; line?: boolean }[];
}) {
	return (
		<div className="num text-dim flex flex-wrap gap-4 text-[11px]">
			{items.map((i) => (
				<span key={i.label} className="inline-flex items-center gap-1.5">
					{i.line ? (
						<span
							className="inline-block h-0.5 w-3.5 rounded-sm"
							style={{ background: i.color }}
						/>
					) : (
						<span
							className="inline-block size-2.5 rounded-sm"
							style={{ background: i.color }}
						/>
					)}
					{i.label}
				</span>
			))}
		</div>
	);
}

type Tip = {
	x: number;
	y: number;
	title: string;
	rows: { label: string; value: string; color: string; line?: boolean }[];
};

function Tooltip({ tip, width }: { tip: Tip | null; width: number }) {
	if (!tip) return null;
	const left = Math.min(Math.max(tip.x + 12, 0), width - 190);
	return (
		<div
			role="status"
			className="border-line-strong bg-hover pointer-events-none absolute z-10 min-w-[170px] rounded-md border px-2.5 py-2 text-xs shadow-[0_8px_24px_rgba(1,4,9,.6)]"
			style={{ left, top: Math.max(tip.y - 10, 0) }}
		>
			<div className="num text-dim mb-1 text-[11px]">{tip.title}</div>
			{tip.rows.map((r) => (
				<div key={r.label} className="flex items-center gap-2">
					<span
						className={
							r.line
								? "inline-block h-0.5 w-3"
								: "inline-block size-2 rounded-sm"
						}
						style={{ background: r.color }}
					/>
					<span className="text-fg-2 flex-1">{r.label}</span>
					<strong className="num text-fg font-medium">{r.value}</strong>
				</div>
			))}
		</div>
	);
}

/** Grouped bars: two series per x (entradas / saídas). */
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
	const width = 640;
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
	const every = Math.ceil(points.length / 12);

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

/** Lines over a shared x, with a crosshair that lists every series. `null` leaves a gap (future days). */
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
	const width = 640;
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
	const every = Math.ceil(n / 8);

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

/** Horizontal bars, one hue (magnitude), each row named and valued in text. */
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
	const max = Math.max(1, ...rows.map((r) => r.value));
	return (
		<ul aria-label={label} className="flex flex-col gap-2.5">
			{rows.map((r) => (
				<li
					key={r.key}
					className="grid grid-cols-[minmax(110px,1.2fr)_2fr_auto] items-center gap-3"
					title={r.note}
				>
					<span className="flex min-w-0 items-center gap-2 truncate">
						{r.dot ? (
							<span
								aria-hidden="true"
								className="size-2 shrink-0 rounded-sm"
								style={{ background: r.dot }}
							/>
						) : null}
						<span className="truncate">{r.name}</span>
					</span>
					<span className="bg-hover h-1.5 overflow-hidden rounded-full">
						<span
							className="block h-1.5 rounded-full"
							style={{
								width: `${(r.value / max) * 100}%`,
								background: SERIES.magnitude,
							}}
						/>
					</span>
					<span className="num min-w-[72px] text-right">{money(r.value)}</span>
				</li>
			))}
		</ul>
	);
}

/** "+12%" / "−8%" against a previous value; good/bad depends on what the number is. */
export function Delta({
	now,
	before,
	goodWhenUp,
}: {
	now: number;
	before: number;
	goodWhenUp: boolean;
}) {
	if (before === 0)
		return (
			<span className="num text-dim text-[11px]">sem período anterior</span>
		);
	const pct = Math.round(((now - before) / Math.abs(before)) * 100);
	const good = pct === 0 ? null : pct > 0 === goodWhenUp;
	return (
		<span
			className={`num inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
				good === null
					? "border-line-strong text-dim"
					: good
						? "border-money-line bg-money-bg text-money-2"
						: "border-warn-line bg-warn-bg text-warn"
			}`}
		>
			<span aria-hidden="true">{pct > 0 ? "↑" : pct < 0 ? "↓" : "="}</span>
			{pct > 0 ? "+" : pct < 0 ? "−" : ""}
			{Math.abs(pct)}% vs anterior
		</span>
	);
}
