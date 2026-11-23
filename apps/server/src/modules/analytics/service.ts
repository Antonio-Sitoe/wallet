import type {
	BalancePoint,
	Bucket,
	CashflowTrend,
	CategoryBreakdown,
	ComparisonPoint,
	Overview,
} from "@wallet/shared";

import { unprocessable } from "../../lib/errors";
import {
	addDays,
	addYears,
	autoBucket,
	buckets,
	cumulative,
	daysBetween,
	endOf,
	previousRange,
	range,
	startOf,
} from "./periods";

/** Read-only: everything comes from the other modules through these ports. */
export type AnalyticsDeps = {
	transactions: {
		dailyTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<{ day: string; income: number; expense: number }[]>;
		netBefore(userId: string, at: Date): Promise<number>;
		categoryTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<
			{ categoryId: string | null; income: number; expense: number }[]
		>;
	};
	accounts: { initialTotal(userId: string): Promise<number> };
	categories: {
		list(userId: string): Promise<
			{
				id: string;
				name: string;
				color: string | null;
				parentId: string | null;
			}[]
		>;
	};
};

const todayInMaputo = () =>
	new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);

export function createAnalyticsService(deps: AnalyticsDeps) {
	const daily = async (userId: string, from: string, to: string) => {
		const rows = await deps.transactions.dailyTotals(
			userId,
			startOf(from),
			endOf(to),
		);
		return new Map(rows.map((r) => [r.day, r]));
	};

	const totals = async (userId: string, from: string, to: string) => {
		const rows = await deps.transactions.dailyTotals(
			userId,
			startOf(from),
			endOf(to),
		);
		const income = rows.reduce((s, r) => s + r.income, 0);
		const expense = rows.reduce((s, r) => s + r.expense, 0);
		return { income, expense, net: income - expense };
	};

	/** Balance of every account together at an instant. */
	const balanceAt = async (userId: string, at: Date) =>
		(await deps.accounts.initialTotal(userId)) +
		(await deps.transactions.netBefore(userId, at));

	return {
		async overview(
			userId: string,
			from: string,
			to: string,
		): Promise<Overview> {
			const previous = previousRange(from, to);
			const [current, before, start, end] = await Promise.all([
				totals(userId, from, to),
				totals(userId, previous.from, previous.to),
				balanceAt(userId, startOf(from)),
				balanceAt(userId, endOf(to)),
			]);
			return {
				period: range(from, to),
				previous,
				balance: { start, end },
				...current,
				previousTotals: before,
			};
		},

		async cashflow(
			userId: string,
			from: string,
			to: string,
			bucket?: Bucket,
		): Promise<CashflowTrend> {
			const chosen = bucket ?? autoBucket(from, to);
			if (chosen === "day" && daysBetween(from, to) > 400) {
				throw unprocessable(
					"TOO_MANY_POINTS",
					"Para períodos longos use semana ou mês",
				);
			}
			const byDay = await daily(userId, from, to);
			const points = buckets(from, to, chosen).map((b) => {
				let income = 0;
				let expense = 0;
				for (let d = b.start; d <= b.end; d = addDays(d, 1)) {
					income += byDay.get(d)?.income ?? 0;
					expense += byDay.get(d)?.expense ?? 0;
				}
				return { ...b, income, expense, net: income - expense };
			});
			return { bucket: chosen, points };
		},

		/** Total balance at the end of each day (or bucket) of the period. */
		async balance(
			userId: string,
			from: string,
			to: string,
			bucket?: Bucket,
		): Promise<BalancePoint[]> {
			const chosen = bucket ?? autoBucket(from, to);
			const [start, byDay] = await Promise.all([
				balanceAt(userId, startOf(from)),
				daily(userId, from, to),
			]);
			const nets = new Map(
				[...byDay].map(([d, r]) => [d, r.income - r.expense]),
			);
			const running = cumulative(from, to, nets);
			return buckets(from, to, chosen).map((b) => ({
				date: b.end,
				balance: start + (running[daysBetween(from, b.end)] ?? 0),
			}));
		},

		/** Spending per top-level category, with the previous period beside it. */
		async categories(
			userId: string,
			from: string,
			to: string,
			limit: number,
		): Promise<CategoryBreakdown> {
			const previous = previousRange(from, to);
			const [list, current, before] = await Promise.all([
				deps.categories.list(userId),
				deps.transactions.categoryTotals(userId, startOf(from), endOf(to)),
				deps.transactions.categoryTotals(
					userId,
					startOf(previous.from),
					endOf(previous.to),
				),
			]);
			const byId = new Map(list.map((c) => [c.id, c]));
			const topOf = (id: string | null) =>
				id ? (byId.get(id)?.parentId ?? id) : null;
			const roll = (rows: { categoryId: string | null; expense: number }[]) => {
				const m = new Map<string | null, number>();
				for (const r of rows)
					if (r.expense > 0)
						m.set(
							topOf(r.categoryId),
							(m.get(topOf(r.categoryId)) ?? 0) + r.expense,
						);
				return m;
			};
			const now = roll(current);
			const then = roll(before);
			const total = [...now.values()].reduce((s, v) => s + v, 0);
			const all = [...now]
				.map(([categoryId, expense]) => {
					const c = categoryId ? byId.get(categoryId) : undefined;
					return {
						categoryId,
						name: c?.name ?? "Sem categoria",
						color: c?.color ?? null,
						expense,
						previousExpense: then.get(categoryId) ?? 0,
						share: total ? expense / total : 0,
					};
				})
				.sort((a, b) => b.expense - a.expense);
			const items = all.slice(0, limit);
			return {
				total,
				previousTotal: [...then.values()].reduce((s, v) => s + v, 0),
				items,
				others: all.slice(limit).reduce((s, i) => s + i.expense, 0),
			};
		},

		/** Cumulative cash flow of this period against the previous one and the same dates a year earlier. */
		async comparison(
			userId: string,
			from: string,
			to: string,
		): Promise<ComparisonPoint[]> {
			const previous = previousRange(from, to);
			const ago = { from: addYears(from, -1), to: addYears(to, -1) };
			const nets = async (a: string, b: string) =>
				new Map(
					[...(await daily(userId, a, b))].map(([d, r]) => [
						d,
						r.income - r.expense,
					]),
				);
			const [cur, prev, old] = await Promise.all([
				nets(from, to),
				nets(previous.from, previous.to),
				nets(ago.from, ago.to),
			]);
			const days = daysBetween(from, to) + 1;
			const a = cumulative(from, to, cur);
			const b = cumulative(previous.from, previous.to, prev);
			const c = cumulative(ago.from, ago.to, old);
			const today = todayInMaputo();
			return Array.from({ length: days }, (_, i) => {
				const date = addDays(from, i);
				return {
					day: i + 1,
					date,
					current: date <= today ? (a[i] ?? 0) : null,
					previous: b[i] ?? b.at(-1) ?? 0,
					yearAgo: c[i] ?? c.at(-1) ?? 0,
				};
			});
		},
	};
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
