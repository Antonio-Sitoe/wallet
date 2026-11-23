import { describe, expect, it } from "vitest";

import { AnalyticsService } from "./analytics.service";
import type { AnalyticsDeps } from "./analytics.types";

const NOVEMBER = new Date("2026-11-10T00:00:00Z");

function serviceWith(
	rows: {
		categoryId: string | null;
		accountId: string;
		income: number;
		expense: number;
		at: Date;
	}[],
) {
	const inRange = (from: Date, to: Date) =>
		rows.filter((r) => r.at >= from && r.at < to);
	const deps: AnalyticsDeps = {
		transactions: {
			dailyTotals: async () => [],
			netBefore: async () => 0,
			dailyNet: async () => [],
			categoryTotals: async (_u, from, to) => inRange(from, to),
			accountTotals: async (_u, from, to) => inRange(from, to),
		},
		accounts: {
			initialTotal: async () => 0,
			list: async () => [
				{ id: "bci", name: "BCI", color: "#58A6FF", initialBalance: 0 },
				{ id: "cash", name: "Numerário", color: null, initialBalance: 0 },
			],
		},
		categories: {
			list: async () => [
				{ id: "food", name: "Alimentação", color: "#f00", parentId: null },
				{ id: "market", name: "Mercado", color: null, parentId: "food" },
				{ id: "home", name: "Moradia", color: "#0f0", parentId: null },
				{ id: "salary", name: "Salário", color: null, parentId: null },
			],
		},
	};
	return new AnalyticsService(deps);
}

const period = { from: "2026-11-01", to: "2026-11-30" };

describe("breakdown", () => {
	const service = serviceWith([
		{
			categoryId: "market",
			accountId: "bci",
			income: 0,
			expense: 3000,
			at: NOVEMBER,
		},
		{
			categoryId: "food",
			accountId: "cash",
			income: 0,
			expense: 1000,
			at: NOVEMBER,
		},
		{
			categoryId: "home",
			accountId: "bci",
			income: 0,
			expense: 6000,
			at: NOVEMBER,
		},
		{
			categoryId: null,
			accountId: "cash",
			income: 0,
			expense: 500,
			at: NOVEMBER,
		},
		{
			categoryId: "salary",
			accountId: "bci",
			income: 90000,
			expense: 0,
			at: NOVEMBER,
		},
		{
			categoryId: "home",
			accountId: "bci",
			income: 0,
			expense: 2000,
			at: new Date("2026-10-15T00:00:00Z"),
		},
	]);

	it("rolls subcategories into their parent and sorts by value", async () => {
		const result = await service.breakdown("u", {
			...period,
			by: "category",
			flow: "expense",
			limit: 7,
		});
		expect(result.total).toBe(10500);
		expect(result.items.map((i) => [i.name, i.value])).toEqual([
			["Moradia", 6000],
			["Alimentação", 4000],
			["Sem categoria", 500],
		]);
		expect(result.items[0]?.previousValue).toBe(2000);
		expect(result.previousTotal).toBe(2000);
	});

	it("groups by account and keeps the account colour", async () => {
		const result = await service.breakdown("u", {
			...period,
			by: "account",
			flow: "expense",
			limit: 7,
		});
		expect(result.items).toEqual([
			expect.objectContaining({ id: "bci", value: 9000, color: "#58A6FF" }),
			expect.objectContaining({ id: "cash", name: "Numerário", value: 1500 }),
		]);
	});

	it("reads income when asked and folds the tail into others", async () => {
		const income = await service.breakdown("u", {
			...period,
			by: "category",
			flow: "income",
			limit: 7,
		});
		expect(income.items.map((i) => i.name)).toEqual(["Salário"]);

		const capped = await service.breakdown("u", {
			...period,
			by: "category",
			flow: "expense",
			limit: 1,
		});
		expect(capped.items).toHaveLength(1);
		expect(capped.others).toBe(4500);
	});
});
