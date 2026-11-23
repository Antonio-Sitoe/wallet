import { describe, expect, it } from "vitest";

import { AnalyticsService } from "./analytics.service";
import type { AnalyticsDeps } from "./analytics.types";

type Movement = { accountId: string; amount: number; at: string };

function serviceWith(movements: Movement[], initial: Record<string, number>) {
	const pick = (accountId?: string) =>
		movements.filter((m) => !accountId || m.accountId === accountId);
	const dayInMaputo = (iso: string) =>
		new Date(Date.parse(iso) + 2 * 3_600_000).toISOString().slice(0, 10);
	const deps: AnalyticsDeps = {
		transactions: {
			dailyTotals: async () => [],
			categoryTotals: async () => [],
			accountTotals: async () => [],
			netBefore: async (_u, at, accountId) =>
				pick(accountId)
					.filter((m) => new Date(m.at) < at)
					.reduce((s, m) => s + m.amount, 0),
			dailyNet: async (_u, from, to, accountId) => {
				const byDay = new Map<string, number>();
				for (const m of pick(accountId)) {
					const at = new Date(m.at);
					if (at < from || at >= to) continue;
					const day = dayInMaputo(m.at);
					byDay.set(day, (byDay.get(day) ?? 0) + m.amount);
				}
				return [...byDay].map(([day, net]) => ({ day, net }));
			},
		},
		accounts: {
			initialTotal: async () =>
				Object.values(initial).reduce((s, v) => s + v, 0),
			list: async () =>
				Object.entries(initial).map(([id, initialBalance]) => ({
					id,
					name: id,
					color: null,
					initialBalance,
				})),
		},
		categories: { list: async () => [] },
	};
	return new AnalyticsService(deps);
}

describe("balance trend", () => {
	const service = serviceWith(
		[
			{ accountId: "bank", amount: 1000, at: "2026-10-20T10:00:00Z" },
			{ accountId: "bank", amount: -300, at: "2026-11-02T10:00:00Z" },
			{ accountId: "cash", amount: 300, at: "2026-11-02T10:00:00Z" },
			{ accountId: "cash", amount: -50, at: "2026-11-03T10:00:00Z" },
			{ accountId: "bank", amount: 20, at: "2026-11-03T10:00:00Z" },
		],
		{ bank: 500, cash: 0 },
	);

	it("follows one account, counting transfers and adjustments", async () => {
		const points = await service.balance(
			"u",
			"2026-11-01",
			"2026-11-03",
			"day",
			"bank",
		);
		expect(points.map((p) => p.balance)).toEqual([1500, 1200, 1220]);
	});

	it("sums every movement for the total", async () => {
		const points = await service.balance(
			"u",
			"2026-11-01",
			"2026-11-03",
			"day",
		);
		expect(points.map((p) => p.balance)).toEqual([1500, 1500, 1470]);
	});

	it("refuses an unknown account", async () => {
		await expect(
			service.balance("u", "2026-11-01", "2026-11-03", "day", "nope"),
		).rejects.toThrow("Conta não encontrado(a)");
	});
});
