import { describe, expect, it } from "vitest";

import {
	attributeSpending,
	itemStatus,
	monthsFor,
	pace,
} from "./budgets.compute";

describe("monthsFor", () => {
	it("expands the frequency", () => {
		expect(monthsFor({ frequency: "monthly", months: [] })).toHaveLength(12);
		expect(monthsFor({ frequency: "months", months: [8, 6, 7, 6] })).toEqual([
			6, 7, 8,
		]);
		expect(monthsFor({ frequency: "once", months: [11] })).toEqual([11]);
	});
});

describe("itemStatus", () => {
	it("follows the design's order", () => {
		expect(itemStatus(0, 300_000)).toBe("unpaid");
		expect(itemStatus(90_000, 300_000)).toBe("partial");
		expect(itemStatus(300_000, 300_000)).toBe("paid");
		expect(itemStatus(310_000, 300_000)).toBe("over");
	});
});

describe("pace", () => {
	it("allows 5% above plan before flagging", () => {
		expect(pace(0, 3_300_000)).toEqual({ pace: "no_data", percent: null });
		expect(pace(3_195_200, 3_300_000)).toEqual({ pace: "within", percent: 97 });
		expect(pace(3_465_000, 3_300_000)).toEqual({
			pace: "within",
			percent: 105,
		});
		expect(pace(6_344_900, 2_200_000)).toEqual({ pace: "over", percent: 288 });
	});
});

describe("attributeSpending", () => {
	const parents = new Map<string, string | null>([
		["transporte", null],
		["viatura", "transporte"],
		["educacao", null],
		["faculdade", "educacao"],
		["escola", "educacao"],
		["comida", null],
	]);
	const items = [
		{ id: "transporte-nov", month: "2026-11", categoryId: "transporte" },
		{ id: "faculdade-nov", month: "2026-11", categoryId: "faculdade" },
		{ id: "escola-nov", month: "2026-11", categoryId: "escola" },
		{ id: "transporte-out", month: "2026-10", categoryId: "transporte" },
	];

	it("matches by exact category, then by parent, per month", () => {
		const { matched, unassigned } = attributeSpending(
			items,
			[
				{
					month: "2026-11",
					categoryId: "transporte",
					type: "expense",
					spent: 90_000,
				},
				{
					month: "2026-11",
					categoryId: "viatura",
					type: "expense",
					spent: 50_000,
				},
				{
					month: "2026-10",
					categoryId: "transporte",
					type: "expense",
					spent: 10_000,
				},
				{
					month: "2026-11",
					categoryId: "faculdade",
					type: "expense",
					spent: 567_000,
				},
			],
			parents,
		);
		expect(matched.get("transporte-nov")).toBe(140_000);
		expect(matched.get("transporte-out")).toBe(10_000);
		expect(matched.get("faculdade-nov")).toBe(567_000);
		expect(unassigned.size).toBe(0);
	});

	it("leaves ambiguous and unmatched expenses unassigned, ignores unmatched transfers", () => {
		const { matched, unassigned } = attributeSpending(
			items,
			[
				{
					month: "2026-11",
					categoryId: "educacao",
					type: "expense",
					spent: 1_000,
				},
				{
					month: "2026-11",
					categoryId: "comida",
					type: "expense",
					spent: 2_000,
				},
				{ month: "2026-11", categoryId: null, type: "expense", spent: 3_000 },
				{
					month: "2026-11",
					categoryId: "transferencia",
					type: "transfer",
					spent: 200_000,
				},
			],
			parents,
		);
		expect(matched.size).toBe(0);
		expect(unassigned.get("2026-11")).toBe(6_000);
	});

	it("splits a shared category between items by what each can still take", () => {
		const shared = [
			{
				id: "estique",
				month: "2026-07",
				categoryId: "xitique",
				capacity: 2_000_000,
			},
			{
				id: "auzenda",
				month: "2026-07",
				categoryId: "xitique",
				capacity: 400_000,
			},
		];
		const { matched, unassigned } = attributeSpending(
			shared,
			[
				{
					month: "2026-07",
					categoryId: "xitique",
					type: "transfer",
					spent: 2_500_000,
				},
			],
			new Map([["xitique", null]]),
		);
		expect(matched.get("estique")).toBe(2_100_000);
		expect(matched.get("auzenda")).toBe(400_000);
		expect(unassigned.size).toBe(0);
	});
});
