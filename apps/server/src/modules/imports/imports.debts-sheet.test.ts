import { describe, expect, it } from "vitest";

import { parseDebtsSheet } from "./imports.debts-sheet";
import type { Sheet } from "./imports.salary-sheet";

const sheetOf = (rows: Record<number, Record<string, string>>): Sheet => ({
	name: "Dividas",
	rows: new Map(
		Object.entries(rows).map(([row, cells]) => [
			Number(row),
			new Map(Object.entries(cells).map(([c, value]) => [c, { value }])),
		]),
	),
});

describe("parseDebtsSheet", () => {
	it("reads who owes me and whom I owe, skipping the total", () => {
		const debts = parseDebtsSheet(
			sheetOf({
				1: { A: "Nomes", B: "Total", D: "Estou a dever", E: "Total" },
				2: { A: "Edmilson Matsinhe", B: "10000.0" },
				3: { A: "Ussman", B: "1846.0", D: "Edi", E: "2000.0" },
				6: { A: "Edilson Sitoe", B: "20000.0" },
				14: { A: "Total", B: "40706" },
			}),
		);
		expect(debts).toEqual([
			{
				person: "Edmilson Matsinhe",
				direction: "owed_to_me",
				amount: 1_000_000,
			},
			{ person: "Ussman", direction: "owed_to_me", amount: 184_600 },
			{ person: "Edilson Sitoe", direction: "owed_to_me", amount: 2_000_000 },
			{ person: "Edi", direction: "i_owe", amount: 200_000 },
		]);
	});

	it("returns nothing without a known header", () => {
		expect(parseDebtsSheet(sheetOf({ 1: { A: "x" } }))).toEqual([]);
	});
});
