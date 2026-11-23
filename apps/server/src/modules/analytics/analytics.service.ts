import { unprocessable } from "../../shared/errors/app-error";
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
} from "./analytics.periods";
import type {
	BalancePoint,
	Bucket,
	CashflowTrend,
	CategoryBreakdown,
	ComparisonPoint,
	Overview,
} from "./analytics.schema";
import type { AnalyticsDeps } from "./analytics.types";

const todayInMaputo = () =>
	new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);

export class AnalyticsService {
	constructor(private readonly deps: AnalyticsDeps) {}

	private async daily(userId: string, from: string, to: string) {
		const rows = await this.deps.transactions.dailyTotals(
			userId,
			startOf(from),
			endOf(to),
		);
		return new Map(rows.map((r) => [r.day, r]));
	}

	private async totals(userId: string, from: string, to: string) {
		const rows = await this.deps.transactions.dailyTotals(
			userId,
			startOf(from),
			endOf(to),
		);
		const income = rows.reduce((s, r) => s + r.income, 0);
		const expense = rows.reduce((s, r) => s + r.expense, 0);
		return { income, expense, net: income - expense };
	}

	private async balanceAt(userId: string, at: Date) {
		return (
			(await this.deps.accounts.initialTotal(userId)) +
			(await this.deps.transactions.netBefore(userId, at))
		);
	}

	async overview(userId: string, from: string, to: string): Promise<Overview> {
		const previous = previousRange(from, to);
		const [current, before, start, end] = await Promise.all([
			this.totals(userId, from, to),
			this.totals(userId, previous.from, previous.to),
			this.balanceAt(userId, startOf(from)),
			this.balanceAt(userId, endOf(to)),
		]);
		return {
			period: range(from, to),
			previous,
			balance: { start, end },
			...current,
			previousTotals: before,
		};
	}

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
		const byDay = await this.daily(userId, from, to);
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
	}

	async balance(
		userId: string,
		from: string,
		to: string,
		bucket?: Bucket,
	): Promise<BalancePoint[]> {
		const chosen = bucket ?? autoBucket(from, to);
		const [start, byDay] = await Promise.all([
			this.balanceAt(userId, startOf(from)),
			this.daily(userId, from, to),
		]);
		const nets = new Map([...byDay].map(([d, r]) => [d, r.income - r.expense]));
		const running = cumulative(from, to, nets);
		return buckets(from, to, chosen).map((b) => ({
			date: b.end,
			balance: start + (running[daysBetween(from, b.end)] ?? 0),
		}));
	}

	async categories(
		userId: string,
		from: string,
		to: string,
		limit: number,
	): Promise<CategoryBreakdown> {
		const previous = previousRange(from, to);
		const [list, current, before] = await Promise.all([
			this.deps.categories.list(userId),
			this.deps.transactions.categoryTotals(userId, startOf(from), endOf(to)),
			this.deps.transactions.categoryTotals(
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
	}

	async comparison(
		userId: string,
		from: string,
		to: string,
	): Promise<ComparisonPoint[]> {
		const previous = previousRange(from, to);
		const ago = { from: addYears(from, -1), to: addYears(to, -1) };
		const nets = async (a: string, b: string) =>
			new Map(
				[...(await this.daily(userId, a, b))].map(([d, r]) => [
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
	}
}
