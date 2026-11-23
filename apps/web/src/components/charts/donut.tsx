import { type ChartConfig, ChartContainer } from "@wallet/ui/components/chart";
import { useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { money } from "@/utils/format";

export type DonutSlice = {
	key: string;
	label: string;
	value: number;
	color: string;
	note?: string;
};

export const SLICE_PALETTE = [
	"#3987e5",
	"#d95926",
	"#199e70",
	"#d29922",
	"#9085e9",
	"#e05d9b",
	"#39c5bb",
	"#a0a75c",
];
export const OTHERS_COLOR = "#6e7681";

const MIN_COLOR_DISTANCE = 90;

const rgbOf = (hex: string) => {
	const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

const colorDistance = (a: string, b: string) => {
	const [r1, g1, b1] = rgbOf(a);
	const [r2, g2, b2] = rgbOf(b);
	return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

export function distinctColors(preferred: (string | null | undefined)[]) {
	const used: string[] = [];
	const isFree = (color: string) =>
		used.every((u) => colorDistance(u, color) >= MIN_COLOR_DISTANCE);
	return preferred.map((wanted, index) => {
		const own = wanted && /^#[0-9a-f]{6}$/i.test(wanted) ? wanted : null;
		const color =
			(own && isFree(own) ? own : undefined) ??
			SLICE_PALETTE.find(isFree) ??
			SLICE_PALETTE[index % SLICE_PALETTE.length] ??
			OTHERS_COLOR;
		used.push(color);
		return color;
	});
}

const INNER_RADIUS = 65;
const OUTER_RADIUS = 91;

export function Donut({
	slices,
	label,
	centerCaption,
	centerNote,
	centerValue,
}: {
	slices: DonutSlice[];
	label: string;
	centerCaption?: string;
	centerNote?: string;
	centerValue?: string;
}) {
	const total = slices.reduce((s, x) => s + x.value, 0);
	const [activeKey, setActiveKey] = useState<string | null>(null);
	const active = slices.find((s) => s.key === activeKey) ?? null;
	const visible = slices.filter((s) => s.value > 0);
	const config: ChartConfig = Object.fromEntries(
		slices.map((s) => [s.key, { label: s.label, color: s.color }]),
	);

	const share = (value: number) =>
		total ? `${Math.round((value / total) * 100)}%` : "0%";

	return (
		<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
			<div className="relative size-[200px] shrink-0">
				<ChartContainer
					config={config}
					role="img"
					aria-label={`${label}: ${slices.map((s) => `${s.label} ${share(s.value)}`).join(", ")}`}
					className="aspect-square size-full"
					onPointerLeave={() => setActiveKey(null)}
				>
					<PieChart>
						<Pie
							data={visible.length ? visible : [{ key: "empty", value: 1 }]}
							dataKey="value"
							nameKey="key"
							innerRadius={INNER_RADIUS}
							outerRadius={OUTER_RADIUS}
							paddingAngle={visible.length > 1 ? 1 : 0}
							stroke="none"
							isAnimationActive={false}
							onMouseEnter={(_, index) =>
								setActiveKey(visible[index]?.key ?? null)
							}
						>
							{visible.length ? (
								visible.map((slice) => (
									<Cell
										key={slice.key}
										fill={slice.color}
										className="cursor-pointer transition-opacity duration-150"
										opacity={activeKey && slice.key !== activeKey ? 0.35 : 1}
									/>
								))
							) : (
								<Cell fill="var(--color-hover)" />
							)}
						</Pie>
					</PieChart>
				</ChartContainer>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-12 text-center">
					<span className="text-fg-2 w-full truncate text-xs">
						{active ? active.label : (centerCaption ?? "Total")}
					</span>
					<span className="num text-[17px] font-medium whitespace-nowrap">
						{active ? money(active.value) : (centerValue ?? money(total))}
					</span>
					{active || centerNote ? (
						<span className="num text-dim text-[11px]">
							{active ? share(active.value) : centerNote}
						</span>
					) : null}
				</div>
			</div>
			<ul className="flex min-w-[200px] flex-1 flex-col gap-0.5">
				{slices.map((slice) => (
					<li key={slice.key}>
						<button
							type="button"
							aria-pressed={slice.key === activeKey}
							onPointerEnter={() => setActiveKey(slice.key)}
							onPointerLeave={() => setActiveKey(null)}
							onFocus={() => setActiveKey(slice.key)}
							onBlur={() => setActiveKey(null)}
							className={`flex w-full cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-left ${slice.key === activeKey ? "bg-hover" : ""}`}
						>
							<span
								aria-hidden="true"
								className="size-2.5 shrink-0 rounded-sm"
								style={{ background: slice.color }}
							/>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate">{slice.label}</span>
								{slice.note ? (
									<span className="num text-dim truncate text-[11px]">
										{slice.note}
									</span>
								) : null}
							</span>
							<span className="num text-dim w-10 text-right text-[11px]">
								{share(slice.value)}
							</span>
							<span className="num text-right whitespace-nowrap">
								{money(slice.value)}
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
