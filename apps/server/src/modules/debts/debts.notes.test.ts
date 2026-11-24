import { describe, expect, it } from "vitest";

import { loanSuggestions, parseLoanNote, personKey } from "./debts.notes";

describe("parseLoanNote", () => {
	it("reads who gave money to whom", () => {
		expect(parseLoanNote("Amilcar Paco → Me")).toEqual({
			person: "Amilcar Paco",
			toMe: true,
		});
		expect(parseLoanNote("Edilson → Eu : Dinheiro da escola de will")).toEqual({
			person: "Edilson",
			toMe: true,
		});
		expect(parseLoanNote("Eu → Délcio")).toEqual({
			person: "Délcio",
			toMe: false,
		});
		expect(parseLoanNote("Me -> Frede : renda")).toEqual({
			person: "Frede",
			toMe: false,
		});
	});

	it("ignores notes without me on one side", () => {
		expect(parseLoanNote("Abril")).toBeNull();
		expect(parseLoanNote("Ana → Rui")).toBeNull();
	});
});

describe("loanSuggestions", () => {
	const row = (type: "income" | "expense", amount: number, note: string) => ({
		type,
		amount: type === "expense" ? -amount : amount,
		note,
	});

	it("nets what I lent against what came back, per person", () => {
		const s = loanSuggestions([
			row("expense", 300_000, "Eu → Délcio"),
			row("expense", 73_000, "Me → Délcio"),
			row("income", 323_000, "Délcio → Eu"),
			row("expense", 100_000, "Eu → Edi"),
			row("income", 300_000, "Edi → Eu"),
			row("expense", 56_000, "Me → Presente Mito"),
		]);
		expect(s).toEqual([
			expect.objectContaining({
				key: "edi",
				direction: "i_owe",
				net: 200_000,
				outCount: 1,
				inCount: 1,
			}),
			expect.objectContaining({
				key: personKey("Délcio"),
				direction: "owed_to_me",
				net: 50_000,
				outCount: 2,
				inTotal: 323_000,
			}),
		]);
	});
});
