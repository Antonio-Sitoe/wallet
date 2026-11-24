import { describe, expect, it } from "vitest";

import {
	addYears,
	autoBucket,
	buckets,
	cumulative,
	endOf,
	previousRange,
	range,
	startOf,
} from "./analytics.periods";

describe("periods", () => {
	it("starts a day at midnight in Maputo", () => {
		expect(startOf("2026-11-01").toISOString()).toBe(
			"2026-10-31T22:00:00.000Z",
		);
		expect(endOf("2026-11-30").toISOString()).toBe("2026-11-30T22:00:00.000Z");
	});

	it("counts days inclusively and finds the previous period", () => {
		expect(range("2026-11-20", "2026-12-19").days).toBe(30);
		expect(previousRange("2026-11-20", "2026-12-19")).toEqual({
			from: "2026-10-21",
			to: "2026-11-19",
			days: 30,
		});
		expect(previousRange("2026-11-01", "2026-11-30")).toEqual({
			from: "2026-10-02",
			to: "2026-10-31",
			days: 30,
		});
	});

	it("shifts a year, keeping 29 Feb valid", () => {
		expect(addYears("2026-11-23", -1)).toBe("2025-11-23");
		expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
	});

	it("picks a bucket from the period length", () => {
		expect(autoBucket("2026-11-01", "2026-11-30")).toBe("day");
		expect(autoBucket("2026-06-01", "2026-11-30")).toBe("week");
		expect(autoBucket("2026-01-01", "2026-12-31")).toBe("month");
	});

	it("splits a period into clipped buckets", () => {
		expect(buckets("2026-01-15", "2026-03-10", "month")).toEqual([
			{ start: "2026-01-15", end: "2026-01-31" },
			{ start: "2026-02-01", end: "2026-02-28" },
			{ start: "2026-03-01", end: "2026-03-10" },
		]);
		expect(buckets("2026-11-20", "2026-12-01", "week")).toEqual([
			{ start: "2026-11-20", end: "2026-11-22" },
			{ start: "2026-11-23", end: "2026-11-29" },
			{ start: "2026-11-30", end: "2026-12-01" },
		]);
		expect(buckets("2026-12-30", "2027-01-01", "day")).toHaveLength(3);
	});

	it("accumulates day by day", () => {
		expect(
			cumulative(
				"2026-11-01",
				"2026-11-04",
				new Map([
					["2026-11-02", 5],
					["2026-11-04", -2],
				]),
			),
		).toEqual([0, 5, 5, 3]);
	});
});
