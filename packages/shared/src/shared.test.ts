import { describe, expect, it } from "vitest";

import { formatMZN, toCents } from "./money";
import {
	addMonths,
	inferReferenceMonth,
	parseMonthName,
	yearMonthOf,
} from "./months";

describe("money", () => {
	it("parses amounts into centavos", () => {
		expect(toCents("1696.67")).toBe(169667);
		expect(toCents("0.5")).toBe(50);
		expect(toCents("104.95")).toBe(10495);
		expect(toCents("1 696,67")).toBe(169667);
		expect(toCents(55000)).toBe(5500000);
		expect(toCents("-20")).toBe(-2000);
	});

	it("rejects garbage", () => {
		expect(() => toCents("abc")).toThrow();
		expect(() => toCents("")).toThrow();
	});

	it("formats like the design", () => {
		expect(formatMZN(8443100)).toBe("84 431");
		expect(formatMZN(-4601358)).toBe("−46 013,58");
		expect(formatMZN(10000, { withCurrency: true })).toBe("100 MZN");
	});
});

describe("months", () => {
	it("uses Mozambique time for the budget month", () => {
		expect(yearMonthOf(new Date("2026-10-31T22:30:00Z"))).toBe("2026-11");
		expect(yearMonthOf(new Date("2026-10-31T21:59:00Z"))).toBe("2026-10");
	});

	it("reads month names with or without accents and case", () => {
		expect(parseMonthName("Abril")).toBe(4);
		expect(parseMonthName("outubro")).toBe(10);
		expect(parseMonthName("Março")).toBe(3);
		expect(parseMonthName("marco")).toBe(3);
		expect(parseMonthName("COISAS A COMPRAR")).toBeNull();
	});

	it("picks the closest year for a month named in a note", () => {
		expect(
			inferReferenceMonth("Dezembro", new Date("2026-01-05T12:09:38Z")),
		).toBe("2025-12");
		expect(
			inferReferenceMonth("Janeiro", new Date("2025-11-30T02:39:29Z")),
		).toBe("2026-01");
		expect(inferReferenceMonth("Abril", new Date("2026-05-11T09:32:37Z"))).toBe(
			"2026-04",
		);
		expect(
			inferReferenceMonth("Outubro", new Date("2023-08-14T11:07:51Z")),
		).toBe("2023-10");
		expect(inferReferenceMonth("Ussman → Me", new Date())).toBeNull();
	});

	it("adds months across years", () => {
		expect(addMonths("2026-11", 2)).toBe("2027-01");
		expect(addMonths("2026-01", -1)).toBe("2025-12");
	});
});
