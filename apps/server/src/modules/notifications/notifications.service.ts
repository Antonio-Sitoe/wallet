import {
	type AppNotice,
	type Debt,
	formatMZN,
	MONTH_NAMES_PT,
	type MonthBudget,
	type NotificationPreferences,
	type Overview,
	type PlannedReminder,
} from "@wallet/shared";

export type NotificationsDeps = {
	preferences(userId: string): Promise<{
		notifications: NotificationPreferences;
	}>;
	planned: {
		reminders(userId: string, today: string): Promise<PlannedReminder[]>;
	};
	debts: {
		list(
			userId: string,
			options: { includeArchived: boolean },
		): Promise<Debt[]>;
	};
	budgets: { getMonth(userId: string, month: string): Promise<MonthBudget> };
	analytics: {
		overview(userId: string, from: string, to: string): Promise<Overview>;
	};
};

export const UNPAID_FROM_DAY = 20;
export const SUMMARY_UNTIL_DAY = 3;

const money = (cents: number) => `${formatMZN(cents)} MZN`;

export const todayInMaputo = () =>
	new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);

const monthName = (month: string) => {
	const name = MONTH_NAMES_PT[Number(month.slice(5, 7)) - 1] ?? month;
	return name.charAt(0).toUpperCase() + name.slice(1);
};

function previousMonth(month: string) {
	const [y, m] = month.split("-").map(Number) as [number, number];
	return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function lastDay(month: string) {
	const [y, m] = month.split("-").map(Number) as [number, number];
	return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const shortDate = (day: string) => `${Number(day.slice(8))}/${day.slice(5, 7)}`;

export class NotificationsService {
	constructor(private readonly deps: NotificationsDeps) {}

	async due(userId: string, today = todayInMaputo()): Promise<AppNotice[]> {
		const { notifications: wants } = await this.deps.preferences(userId);
		const [payments, debts, unpaid, summary] = await Promise.all([
			wants.upcomingPayments ? this.payments(userId, today) : [],
			wants.debtReminders ? this.debts(userId, today) : [],
			wants.unpaidItems ? this.unpaid(userId, today) : [],
			wants.monthSummary ? this.summary(userId, today) : [],
		]);
		return [...payments, ...debts, ...unpaid, ...summary];
	}

	private async payments(userId: string, today: string): Promise<AppNotice[]> {
		const reminders = await this.deps.planned.reminders(userId, today);
		return reminders.map((r) => ({
			key: `payment|${r.key}`,
			kind: "upcomingPayments",
			title: r.title,
			body: r.overdue ? `${r.body} · atrasado` : r.body,
			href: `/payments?id=${r.paymentId}`,
		}));
	}

	private async debts(userId: string, today: string): Promise<AppNotice[]> {
		const debts = await this.deps.debts.list(userId, {
			includeArchived: false,
		});
		return debts
			.filter((d) => d.remindOn && d.remindOn <= today && d.paid < d.amount)
			.map((d) => {
				const left = money(d.amount - d.paid);
				return {
					key: `debt|${d.id}|${today}`,
					kind: "debtReminders",
					title:
						d.direction === "owed_to_me"
							? `${d.person} deve-te ${left}`
							: `Pagar ${left} a ${d.person}`,
					body:
						d.remindOn === today
							? "Lembrete marcado para hoje"
							: `Lembrete marcado para ${shortDate(d.remindOn ?? today)}`,
					href: `/debts?id=${d.id}`,
				};
			});
	}

	private async unpaid(userId: string, today: string): Promise<AppNotice[]> {
		if (Number(today.slice(8)) < UNPAID_FROM_DAY) return [];
		const month = today.slice(0, 7);
		const budget = await this.deps.budgets.getMonth(userId, month);
		if (!budget.hasList) return [];
		const open = budget.items.filter(
			(i) => i.status === "unpaid" || i.status === "partial",
		);
		if (!open.length) return [];
		return [
			{
				key: `unpaid|${month}|${today}`,
				kind: "unpaidItems",
				title: `${open.length} ${open.length === 1 ? "item" : "itens"} por pagar em ${monthName(month)}`,
				body: `Faltam ${money(budget.totals.remaining)} na lista do mês`,
				href: `/budget?month=${month}`,
			},
		];
	}

	private async summary(userId: string, today: string): Promise<AppNotice[]> {
		if (Number(today.slice(8)) > SUMMARY_UNTIL_DAY) return [];
		const month = previousMonth(today.slice(0, 7));
		const o = await this.deps.analytics.overview(
			userId,
			`${month}-01`,
			lastDay(month),
		);
		if (o.income === 0 && o.expense === 0) return [];
		return [
			{
				key: `summary|${month}`,
				kind: "monthSummary",
				title: `Resumo de ${monthName(month)}`,
				body: `Entradas ${money(o.income)} · saídas ${money(o.expense)} · sobra ${money(o.net)}`,
				href: `/stats?period=month&from=${month}-01`,
			},
		];
	}
}
