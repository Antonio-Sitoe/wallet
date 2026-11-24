/**
 * Budget months are "YYYY-MM" strings, computed in Mozambique time (UTC+2, no DST),
 * so a transaction at 23:30 on the last day of the month lands in that month.
 */

export type YearMonth = string;

export const MOZAMBIQUE_OFFSET_MS = 2 * 60 * 60 * 1000;

export const MONTH_NAMES_PT = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
] as const;

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isYearMonth(value: string): boolean {
	return YEAR_MONTH_RE.test(value);
}

export function formatYearMonth(year: number, month: number): YearMonth {
	return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseYearMonth(value: YearMonth): {
	year: number;
	month: number;
} {
	if (!isYearMonth(value)) throw new Error(`Invalid year-month: ${value}`);
	const [year, month] = value.split("-").map(Number) as [number, number];
	return { year, month };
}

/** The budget month a moment falls in, in Mozambique time. */
export function yearMonthOf(date: Date): YearMonth {
	const local = new Date(date.getTime() + MOZAMBIQUE_OFFSET_MS);
	return formatYearMonth(local.getUTCFullYear(), local.getUTCMonth() + 1);
}

export function addMonths(value: YearMonth, delta: number): YearMonth {
	const { year, month } = parseYearMonth(value);
	const index = year * 12 + (month - 1) + delta;
	return formatYearMonth(Math.floor(index / 12), (index % 12) + 1);
}

function normalize(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

const NORMALIZED_MONTHS = MONTH_NAMES_PT.map(normalize);

/** "Abril", "outubro", "Março" → 4, 10, 3. Only a note that is exactly a month name counts. */
export function parseMonthName(text: string): number | null {
	const index = NORMALIZED_MONTHS.indexOf(normalize(text));
	return index === -1 ? null : index + 1;
}

/**
 * A note like "Dezembro" on a transaction dated 5 Jan 2026 means December 2025:
 * pick the year (previous, same or next) that puts the named month closest to the date.
 */
export function inferReferenceMonth(
	note: string,
	occurredAt: Date,
): YearMonth | null {
	const month = parseMonthName(note);
	if (month === null) return null;
	const { year, month: baseMonth } = parseYearMonth(yearMonthOf(occurredAt));
	const baseIndex = year * 12 + baseMonth;
	let best: YearMonth | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const candidateYear of [year - 1, year, year + 1]) {
		const distance = Math.abs(candidateYear * 12 + month - baseIndex);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = formatYearMonth(candidateYear, month);
		}
	}
	return best;
}
