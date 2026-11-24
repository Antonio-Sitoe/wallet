import { MOZAMBIQUE_OFFSET_MS } from "./months";
export const PLANNED_FREQUENCIES = ["once", "monthly", "yearly"] as const;
export type PlannedFrequency = (typeof PLANNED_FREQUENCIES)[number];

export type IsoDay = string;

const pad = (n: number) => String(n).padStart(2, "0");

const daysIn = (year: number, month: number) =>
	new Date(Date.UTC(year, month, 0)).getUTCDate();

const split = (day: IsoDay) => {
	const [y, m, d] = day.split("-").map(Number) as [number, number, number];
	return { y, m, d };
};

const make = (y: number, m: number, d: number) =>
	`${y}-${pad(m)}-${pad(Math.min(d, daysIn(y, m)))}`;

export function addDays(day: IsoDay, n: number): IsoDay {
	const { y, m, d } = split(day);
	return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDay, to: IsoDay): number {
	return Math.round(
		(Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
			86_400_000,
	);
}

export function todayIso(now = new Date()): IsoDay {
	return new Date(now.getTime() + MOZAMBIQUE_OFFSET_MS)
		.toISOString()
		.slice(0, 10);
}

export function dueDates(
	schedule: {
		frequency: PlannedFrequency;
		startDate: IsoDay;
		endDate?: IsoDay | null;
	},
	from: IsoDay,
	to: IsoDay,
): IsoDay[] {
	const end = schedule.endDate && schedule.endDate < to ? schedule.endDate : to;
	const start = split(schedule.startDate);
	if (schedule.frequency === "once")
		return schedule.startDate >= from && schedule.startDate <= end
			? [schedule.startDate]
			: [];

	const out: IsoDay[] = [];
	const step = schedule.frequency === "monthly" ? 1 : 12;
	for (let i = 0; i < 2400; i += step) {
		const total = start.m - 1 + i;
		const date = make(
			start.y + Math.floor(total / 12),
			(total % 12) + 1,
			start.d,
		);
		if (date > end) break;
		if (date >= from) out.push(date);
	}
	return out;
}
