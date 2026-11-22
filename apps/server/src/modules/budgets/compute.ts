/** Budget rules with no database access, so they are unit-tested on their own. */
import type { Frequency, ItemStatus, PaceStatus } from "@wallet/shared";

export const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Months (1–12) a plan item applies to. */
export function monthsFor(item: {
	frequency: Frequency;
	months: number[];
}): number[] {
	if (item.frequency === "monthly") return ALL_MONTHS;
	return [...new Set(item.months)].sort((a, b) => a - b);
}

/** Same rule as the design: over > paid > partial > unpaid. */
export function itemStatus(spent: number, planned: number): ItemStatus {
	if (spent > planned) return "over";
	if (spent >= planned && spent > 0) return "paid";
	if (spent > 0) return "partial";
	return "unpaid";
}

/** Within pace up to 5% above what was planned so far. */
export function pace(
	spentToDate: number,
	plannedToDate: number,
): { pace: PaceStatus; percent: number | null } {
	if (plannedToDate <= 0 || spentToDate <= 0)
		return { pace: "no_data", percent: null };
	const ratio = spentToDate / plannedToDate;
	return {
		pace: ratio > 1.05 ? "over" : "within",
		percent: Math.round(ratio * 100),
	};
}

export type MatchableItem = {
	id: string;
	month: string;
	categoryId: string | null;
};
export type UnlinkedOut = {
	month: string;
	categoryId: string | null;
	type: "expense" | "income" | "transfer";
	/** Positive centavos. */
	spent: number;
};

/**
 * Money spent outside the list (the daily 100 MZN ride, imported history) still counts for the item of its
 * category in that month. A transaction goes to the one item with exactly its category; failing that, to the
 * one item with its parent category. Ambiguous or unmatched expenses stay "unassigned" for the month;
 * unmatched transfers are just money moving between accounts and are not counted.
 */
export function attributeSpending(
	items: MatchableItem[],
	unlinked: UnlinkedOut[],
	parentOf: ReadonlyMap<string, string | null>,
) {
	const matched = new Map<string, number>();
	const unassigned = new Map<string, number>();
	const byMonthCategory = new Map<string, MatchableItem[]>();
	for (const item of items) {
		if (!item.categoryId) continue;
		const key = `${item.month}|${item.categoryId}`;
		byMonthCategory.set(key, [...(byMonthCategory.get(key) ?? []), item]);
	}
	const find = (month: string, categoryId: string | null | undefined) =>
		categoryId ? (byMonthCategory.get(`${month}|${categoryId}`) ?? []) : [];

	for (const row of unlinked) {
		if (row.spent <= 0) continue;
		const exact = find(row.month, row.categoryId);
		const candidates =
			exact.length > 0
				? exact
				: find(row.month, row.categoryId ? parentOf.get(row.categoryId) : null);
		if (candidates.length === 1) {
			const id = candidates[0]!.id;
			matched.set(id, (matched.get(id) ?? 0) + row.spent);
		} else if (row.type === "expense") {
			unassigned.set(row.month, (unassigned.get(row.month) ?? 0) + row.spent);
		}
	}
	return { matched, unassigned };
}
