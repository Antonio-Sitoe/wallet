import type { Category, Transaction } from "@wallet/shared";
import type { TransactionFilters } from "@/@types/transaction-filters";

const WINDOW_MONTHS = 12;

export function windowStart(now = new Date()) {
	return new Date(now.getFullYear(), now.getMonth() - WINDOW_MONTHS, 1);
}

const yearMonth = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export function insideWindow(filters: TransactionFilters, now = new Date()) {
	const start = windowStart(now);
	if (filters.from) return new Date(filters.from) >= start;
	if (filters.referenceMonth) return filters.referenceMonth >= yearMonth(start);
	return false;
}

const normalize = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

function categoryScope(ids: string[] | undefined, categories: Category[]) {
	if (!ids?.length) return null;
	const scope = new Set(ids);
	for (const category of categories)
		if (category.parentId && ids.includes(category.parentId))
			scope.add(category.id);
	return scope;
}

export function filterTransactions(
	rows: Transaction[],
	filters: TransactionFilters,
	categories: Category[],
) {
	const from = filters.from ? new Date(filters.from).getTime() : null;
	const to = filters.to ? new Date(filters.to).getTime() : null;
	const accounts = filters.accountId?.length ? new Set(filters.accountId) : null;
	const scope = categoryScope(filters.categoryId, categories);
	const payee = filters.payee ? normalize(filters.payee) : null;
	const q = filters.q ? normalize(filters.q) : null;
	return rows
		.filter((tx) => {
			const at = new Date(tx.occurredAt).getTime();
			if (from !== null && at < from) return false;
			if (to !== null && at >= to) return false;
			if (accounts && !accounts.has(tx.accountId)) return false;
			if (scope && !(tx.categoryId && scope.has(tx.categoryId))) return false;
			if (filters.type && tx.type !== filters.type) return false;
			if (filters.referenceMonth && tx.referenceMonth !== filters.referenceMonth)
				return false;
			if (payee !== null && normalize(tx.payee) !== payee) return false;
			if (filters.label && !tx.labels.includes(filters.label)) return false;
			if (
				q !== null &&
				!normalize(tx.note).includes(q) &&
				!normalize(tx.payee).includes(q)
			)
				return false;
			return true;
		})
		.sort((a, b) =>
			a.occurredAt === b.occurredAt
				? b.id.localeCompare(a.id)
				: new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
		);
}
