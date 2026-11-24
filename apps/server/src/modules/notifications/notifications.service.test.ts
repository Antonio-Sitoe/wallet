import type {
	Debt,
	MonthBudget,
	NotificationPreferences,
	Overview,
} from "@wallet/shared";
import { describe, expect, it } from "vitest";

import {
	type NotificationsDeps,
	NotificationsService,
} from "./notifications.service";

const ALL_ON: NotificationPreferences = {
	upcomingPayments: true,
	unpaidItems: true,
	debtReminders: true,
	monthSummary: true,
};

const debt = (over: Partial<Debt>): Debt => ({
	id: "d1",
	person: "Edilson",
	direction: "owed_to_me",
	amount: 500_000,
	paid: 100_000,
	note: null,
	remindOn: "2026-11-05",
	archived: false,
	imported: false,
	createdAt: "2026-11-01T00:00:00Z",
	payments: [],
	...over,
});

function service(
	wants: Partial<NotificationPreferences> = {},
	data: { debts?: Debt[]; items?: { status: string }[] } = {},
) {
	const deps: NotificationsDeps = {
		preferences: async () => ({ notifications: { ...ALL_ON, ...wants } }),
		planned: {
			reminders: async (_u, today) => [
				{
					key: `p1|${today}|${today}`,
					paymentId: "p1",
					dueDate: today,
					title: "Internet hoje",
					body: "1 900 MZN",
					overdue: false,
				},
			],
		},
		debts: { list: async () => data.debts ?? [] },
		budgets: {
			getMonth: async (_u, month) =>
				({
					month,
					hasList: true,
					totals: { remaining: 3_000_000 },
					items: data.items ?? [],
				}) as unknown as MonthBudget,
		},
		analytics: {
			overview: async () =>
				({ income: 5_500_000, expense: 4_000_000, net: 1_500_000 }) as Overview,
		},
	};
	return new NotificationsService(deps);
}

describe("notifications", () => {
	it("sends only the kinds switched on", async () => {
		const notices = await service({
			upcomingPayments: false,
			monthSummary: false,
			unpaidItems: false,
		}).due("u", "2026-11-02");
		expect(notices.map((n) => n.kind)).toEqual([]);
	});

	it("passes planned payment reminders through with a link", async () => {
		const [notice] = await service({}, {}).due("u", "2026-11-10");
		expect(notice).toMatchObject({
			kind: "upcomingPayments",
			title: "Internet hoje",
			href: "/payments?id=p1",
		});
	});

	it("reminds of open debts on or after the date, once a day", async () => {
		const notices = await service(
			{ upcomingPayments: false },
			{
				debts: [
					debt({}),
					debt({ id: "paid", paid: 500_000 }),
					debt({ id: "later", remindOn: "2026-12-01" }),
					debt({
						id: "mine",
						direction: "i_owe",
						person: "Mama",
						remindOn: "2026-11-10",
					}),
				],
			},
		).due("u", "2026-11-10");
		expect(notices.map((n) => [n.key, n.title, n.body])).toEqual([
			[
				"debt|d1|2026-11-10",
				"Edilson deve-te 4 000 MZN",
				"Lembrete marcado para 5/11",
			],
			[
				"debt|mine|2026-11-10",
				"Pagar 4 000 MZN a Mama",
				"Lembrete marcado para hoje",
			],
		]);
	});

	it("lists unpaid items only from day 20", async () => {
		const items = [
			{ status: "unpaid" },
			{ status: "partial" },
			{ status: "paid" },
		];
		const early = await service({ upcomingPayments: false }, { items }).due(
			"u",
			"2026-11-19",
		);
		expect(early).toEqual([]);
		const [late] = await service({ upcomingPayments: false }, { items }).due(
			"u",
			"2026-11-20",
		);
		expect(late).toMatchObject({
			kind: "unpaidItems",
			title: "2 itens por pagar em Novembro",
			body: "Faltam 30 000 MZN na lista do mês",
			href: "/budget?month=2026-11",
		});
	});

	it("sums up the previous month in the first days", async () => {
		const [summary] = await service({ upcomingPayments: false }).due(
			"u",
			"2027-01-02",
		);
		expect(summary).toMatchObject({
			key: "summary|2026-12",
			title: "Resumo de Dezembro",
			href: "/stats?period=month&from=2026-12-01",
		});
		expect(
			await service({ upcomingPayments: false }).due("u", "2027-01-04"),
		).toEqual([]);
	});
});
