import { describe, expect, it } from "vitest";

import { parseShoppingLine } from "./shopping-text";

describe("parseShoppingLine", () => {
	it.each([
		["Leite", { name: "Leite", quantity: 1, unitPrice: null }],
		["Leite 85", { name: "Leite", quantity: 1, unitPrice: 8_500 }],
		["Arroz 2x 350", { name: "Arroz", quantity: 2, unitPrice: 35_000 }],
		["Arroz x2 350", { name: "Arroz", quantity: 2, unitPrice: 35_000 }],
		["2 Arroz 350", { name: "Arroz", quantity: 2, unitPrice: 35_000 }],
		[
			"Óleo de cozinha 3× 189,50",
			{
				name: "Óleo de cozinha",
				quantity: 3,
				unitPrice: 18_950,
			},
		],
		["Carne 1,5x 600", { name: "Carne", quantity: 1.5, unitPrice: 60_000 }],
		["Pão 0", { name: "Pão", quantity: 1, unitPrice: null }],
		["7Up", { name: "7Up", quantity: 1, unitPrice: null }],
		["350", { name: "350", quantity: 1, unitPrice: null }],
	])("%s", (text, expected) => {
		expect(parseShoppingLine(text)).toEqual(expected);
	});

	it("returns null when there is no name", () => {
		expect(parseShoppingLine("   ")).toBeNull();
		expect(parseShoppingLine("2x")).toBeNull();
	});
});
