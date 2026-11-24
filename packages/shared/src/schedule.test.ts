import { describe, expect, it } from "vitest";

import { addDays, daysBetween, dueDates, todayIso } from "./schedule";

describe("dueDates", () => {
	it("repeats monthly on the same day", () => {
		expect(
			dueDates(
				{ frequency: "monthly", startDate: "2026-12-10" },
				"2026-11-01",
				"2027-02-28",
			),
		).toEqual(["2026-12-10", "2027-01-10", "2027-02-10"]);
	});

	it("uses the last day of shorter months", () => {
		expect(
			dueDates(
				{ frequency: "monthly", startDate: "2027-01-31" },
				"2027-01-01",
				"2027-04-30",
			),
		).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
	});

	it("repeats yearly and stops at the end date", () => {
		expect(
			dueDates(
				{ frequency: "yearly", startDate: "2027-01-20", endDate: "2028-12-31" },
				"2026-01-01",
				"2030-12-31",
			),
		).toEqual(["2027-01-20", "2028-01-20"]);
	});

	it("gives a one-off date only inside the window", () => {
		const once = { frequency: "once" as const, startDate: "2026-12-05" };
		expect(dueDates(once, "2026-12-01", "2026-12-31")).toEqual(["2026-12-05"]);
		expect(dueDates(once, "2026-12-06", "2026-12-31")).toEqual([]);
	});

	it("skips dates before the window", () => {
		expect(
			dueDates(
				{ frequency: "monthly", startDate: "2026-01-05" },
				"2026-11-06",
				"2026-12-31",
			),
		).toEqual(["2026-12-05"]);
	});
});

describe("day arithmetic", () => {
	it("adds days across months", () => {
		expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
		expect(addDays("2026-12-03", -5)).toBe("2026-11-28");
	});

	it("today is the day in Maputo", () => {
		expect(todayIso(new Date("2026-12-05T22:30:00Z"))).toBe("2026-12-06");
		expect(todayIso(new Date("2026-12-05T21:59:00Z"))).toBe("2026-12-05");
	});

	it("counts days between", () => {
		expect(daysBetween("2026-12-05", "2026-12-09")).toBe(4);
		expect(daysBetween("2026-12-09", "2026-12-05")).toBe(-4);
	});
});
