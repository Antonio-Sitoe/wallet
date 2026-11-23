/** Date arithmetic on "YYYY-MM-DD" days in Mozambique time (UTC+2, no DST). Pure, unit-tested. */
import type { Bucket, PeriodRange } from "@wallet/shared";

const DAY_MS = 86_400_000;
const OFFSET_MS = 2 * 3_600_000;

const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: string, n: number) =>
	fromUtc(toUtc(day) + n * DAY_MS);
export const daysBetween = (from: string, to: string) =>
	Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

/** The instant a Mozambique day starts. */
export const startOf = (day: string) => new Date(toUtc(day) - OFFSET_MS);
/** Exclusive end instant of a period whose last day is `day`. */
export const endOf = (day: string) => startOf(addDays(day, 1));

export function addYears(day: string, n: number) {
	const [y, m, d] = day.split("-").map(Number) as [number, number, number];
	// 29 Feb → 28 Feb in a non-leap year.
	const last = new Date(Date.UTC(y + n, m, 0)).getUTCDate();
	return fromUtc(Date.UTC(y + n, m - 1, Math.min(d, last)));
}

export function range(from: string, to: string): PeriodRange {
	return { from, to, days: daysBetween(from, to) + 1 };
}

/** The period of the same length that ends the day before `from`. */
export function previousRange(from: string, to: string): PeriodRange {
	const days = daysBetween(from, to) + 1;
	return range(addDays(from, -days), addDays(from, -1));
}

export function autoBucket(from: string, to: string): Bucket {
	const days = daysBetween(from, to) + 1;
	if (days <= 45) return "day";
	if (days <= 200) return "week";
	return "month";
}

/** The first day of the bucket containing `day` (weeks start on Monday). */
export function bucketStart(day: string, bucket: Bucket) {
	if (bucket === "day") return day;
	if (bucket === "month") return `${day.slice(0, 7)}-01`;
	const weekday = (new Date(toUtc(day)).getUTCDay() + 6) % 7; // Monday = 0
	return addDays(day, -weekday);
}

/** Buckets covering [from, to], each clipped to the period. */
export function buckets(from: string, to: string, bucket: Bucket) {
	const out: { start: string; end: string }[] = [];
	let cursor = from;
	while (cursor <= to) {
		const first = bucketStart(cursor, bucket);
		const next =
			bucket === "day"
				? addDays(first, 1)
				: bucket === "week"
					? addDays(first, 7)
					: fromUtc(
							Date.UTC(Number(first.slice(0, 4)), Number(first.slice(5, 7)), 1),
						);
		const last = addDays(next, -1);
		out.push({ start: cursor, end: last < to ? last : to });
		cursor = next;
	}
	return out;
}

/** Running total of `values[day]` over every day of [from, to]. */
export function cumulative(
	from: string,
	to: string,
	values: ReadonlyMap<string, number>,
) {
	const out: number[] = [];
	let total = 0;
	for (let d = from; d <= to; d = addDays(d, 1)) {
		total += values.get(d) ?? 0;
		out.push(total);
	}
	return out;
}
