import { describe, expect, it } from "vitest";

import { parseEmergencySheet } from "./imports.emergency-sheet";
import type { Sheet } from "./imports.salary-sheet";

const sheetOf = (rows: Record<number, Record<string, string>>): Sheet => ({
	name: "Emergencia",
	rows: new Map(
		Object.entries(rows).map(([row, cells]) => [
			Number(row),
			new Map(Object.entries(cells).map(([c, value]) => [c, { value }])),
		]),
	),
});

const real = sheetOf({
	1: { A: "Mes", B: "Saldo Emergencia", C: "Total" },
	2: { A: "Agosto", B: "16250.0", C: "16250", F: "Pago", G: "Falta" },
	3: {
		A: "Setembro",
		E: "Investimento (Material da moto)",
		F: "500.0",
		G: "2300.0",
	},
	4: { A: "Outubro", E: "Pedreiro", G: "15000.0" },
	5: { E: "Fossa", F: "15500.0" },
	8: { E: "Casamento Edilson", F: "9000.0" },
	13: { F: "Levei ", G: "Atual", H: "Total" },
	14: { E: "Obra", F: "2000.0", G: "27000.0", H: "50000.0" },
});

describe("parseEmergencySheet", () => {
	it("reads the emergency balance, the goals and their parts", () => {
		const parsed = parseEmergencySheet(real);
		expect(parsed.emergencySaved).toBe(1_625_000);
		expect(parsed.goals).toEqual([
			{ name: "Obra", saved: 2_700_000, target: 5_000_000 },
		]);
		expect(parsed.parts).toEqual([
			{
				name: "Investimento (Material da moto)",
				paid: 50_000,
				missing: 230_000,
			},
			{ name: "Pedreiro", paid: 0, missing: 1_500_000 },
			{ name: "Fossa", paid: 1_550_000, missing: 0 },
			{ name: "Casamento Edilson", paid: 900_000, missing: 0 },
		]);
	});

	it("takes the latest emergency balance", () => {
		const parsed = parseEmergencySheet(
			sheetOf({
				1: { A: "Mes", B: "Saldo Emergencia" },
				2: { A: "Agosto", B: "16250" },
				3: { A: "Setembro", B: "21250" },
			}),
		);
		expect(parsed.emergencySaved).toBe(2_125_000);
		expect(parsed.goals).toEqual([]);
		expect(parsed.parts).toEqual([]);
	});

	it("returns nothing for a sheet without these tables", () => {
		expect(parseEmergencySheet(sheetOf({ 1: { A: "x" } }))).toEqual({
			emergencySaved: null,
			goals: [],
			parts: [],
		});
	});
});
