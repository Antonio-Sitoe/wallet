import { type RefObject, useEffect, useState } from "react";

export const GRID = "#1f242b";

export function useWidth(ref: RefObject<HTMLElement | null>, fallback = 640) {
	const [width, setWidth] = useState(fallback);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const update = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref]);
	return width;
}

export const AXIS_TEXT = "#8b949e";

export function compact(cents: number) {
	const mzn = cents / 100;
	const abs = Math.abs(mzn);
	if (abs >= 1_000_000)
		return `${(mzn / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
	if (abs >= 1_000) return `${Math.round(mzn / 1_000)}k`;
	return String(Math.round(mzn));
}

export function niceTicks(min: number, rawMax: number, count = 4) {
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

export type Tip = {
	x: number;
	y: number;
	title: string;
	rows: { label: string; value: string; color: string; line?: boolean }[];
};
