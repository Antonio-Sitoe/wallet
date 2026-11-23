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
	/** What the item can still take (planned − paid from the list). Lets items that share a category split it. */
	capacity?: number;
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
 * one item with its parent category. When several items share the category (Estique and Xitique Auzenda),
 * the money fills them one by one up to their capacity, largest first, and any excess goes to the largest.
 * Unmatched expenses stay "unassigned" for the month; unmatched transfers are just money moving between
 * accounts and are not counted.
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
		const splittable = candidates.length > 1 && candidates.every((c) => c.capacity !== undefined);
		if (candidates.length === 1) {
			const id = candidates[0]!.id;
			matched.set(id, (matched.get(id) ?? 0) + row.spent);
		} else if (splittable) {
			const ordered = [...candidates].sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));
			let left = row.spent;
			for (const c of ordered) {
				const room = Math.max(0, (c.capacity ?? 0) - (matched.get(c.id) ?? 0));
				const take = Math.min(room, left);
				if (take > 0) matched.set(c.id, (matched.get(c.id) ?? 0) + take);
				left -= take;
			}
			if (left > 0) matched.set(ordered[0]!.id, (matched.get(ordered[0]!.id) ?? 0) + left);
		} else if (row.type === "expense") {
			unassigned.set(row.month, (unassigned.get(row.month) ?? 0) + row.spent);
		}
	}
	return { matched, unassigned };
}
