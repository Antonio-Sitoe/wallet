import {
	addDays,
	daysBetween,
	dueDates,
	formatMZN,
	todayIso,
} from "@wallet/shared";

import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import type { PlannedRepository } from "./planned.repository";
import type {
	ConfirmPlannedPaymentInput,
	CreatePlannedPaymentInput,
	OccurrenceStatus,
	PlannedOccurrence,
	PlannedPayment,
	PlannedReminder,
	UpdatePlannedPaymentInput,
} from "./planned.schema";
import type {
	PlannedDeps,
	PlannedEventWithPayment,
	PlannedPaymentWithPlan,
} from "./planned.types";

const DUE_SOON_DAYS = 7;
const OVERDUE_LOOKBACK_DAYS = 90;
const OVERDUE_REMINDER_DAYS = 3;

const toPayment = (row: PlannedPaymentWithPlan): PlannedPayment => ({
	id: row.id,
	name: row.name,
	kind: row.kind,
	amount: row.amount,
	accountId: row.accountId,
	toAccountId: row.toAccountId,
	categoryId: row.categoryId,
	frequency: row.frequency,
	startDate: row.startDate,
	endDate: row.endDate,
	remindDays: row.remindDays,
	planItemId: row.planItemId,
	planItemName: row.planItemName,
	note: row.note,
	archived: row.archived,
	createdAt: row.createdAt.toISOString(),
});

const isPaid = (event: PlannedEventWithPayment | undefined) =>
	event?.status === "paid" && (event.transactionId || event.transferId);

export function statusOf(
	dueDate: string,
	today: string,
	event: PlannedEventWithPayment | undefined,
): OccurrenceStatus {
	if (isPaid(event)) return "paid";
	if (event?.status === "skipped") return "skipped";
	if (dueDate < today) return "overdue";
	if (daysBetween(today, dueDate) <= DUE_SOON_DAYS) return "due";
	return "scheduled";
}

const plural = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

export function reminderTitle(name: string, dueDate: string, today: string) {
	const days = daysBetween(today, dueDate);
	if (days < 0) return `${name} está atrasado ${plural(-days, "dia", "dias")}`;
	if (days === 0) return `${name} vence hoje`;
	if (days === 1) return `${name} vence amanhã`;
	return `${name} vence dentro de ${plural(days, "dia", "dias")}`;
}

export class PlannedService {
	constructor(
		private readonly repository: PlannedRepository,
		private readonly deps: PlannedDeps,
	) {}

	async list(
		userId: string,
		options: { includeArchived: boolean },
	): Promise<PlannedPayment[]> {
		return (await this.repository.list(userId, options)).map(toPayment);
	}

	async get(userId: string, id: string): Promise<PlannedPayment> {
		return toPayment(await this.find(userId, id));
	}

	async create(
		userId: string,
		input: CreatePlannedPaymentInput,
	): Promise<PlannedPayment> {
		await this.assertRefs(userId, input);
		const row = await this.repository.insert({
			userId,
			name: input.name,
			kind: input.kind,
			amount: input.amount,
			accountId: input.accountId,
			toAccountId:
				input.kind === "transfer" ? (input.toAccountId ?? null) : null,
			categoryId: input.kind === "expense" ? (input.categoryId ?? null) : null,
			frequency: input.frequency ?? "monthly",
			startDate: input.startDate,
			endDate: input.endDate ?? null,
			remindDays: input.remindDays === undefined ? 1 : input.remindDays,
			planItemId: input.planItemId ?? null,
			note: input.note ?? null,
		});
		return this.get(userId, row.id);
	}

	async update(
		userId: string,
		id: string,
		input: UpdatePlannedPaymentInput,
	): Promise<PlannedPayment> {
		const current = await this.find(userId, id);
		const kind = input.kind ?? current.kind;
		const toAccountId =
			input.toAccountId === undefined ? current.toAccountId : input.toAccountId;
		const accountId = input.accountId ?? current.accountId;
		if (kind === "transfer" && !toAccountId)
			throw unprocessable("TO_ACCOUNT_REQUIRED", "Escolha a conta de destino");
		if (toAccountId && toAccountId === accountId)
			throw unprocessable(
				"SAME_ACCOUNT",
				"A conta de origem e a de destino têm de ser diferentes",
			);
		await this.assertRefs(userId, input);
		await this.repository.update(userId, id, {
			...input,
			...(kind === "expense" ? { toAccountId: null } : { categoryId: null }),
		});
		return this.get(userId, id);
	}

	async remove(userId: string, id: string) {
		await this.find(userId, id);
		await this.repository.delete(userId, id);
	}

	async occurrences(
		userId: string,
		query: { from?: string; to?: string; today?: string },
	): Promise<PlannedOccurrence[]> {
		const today = query.today ?? todayIso();
		const from = query.from ?? addDays(today, -OVERDUE_LOOKBACK_DAYS);
		const to = query.to ?? addDays(today, 62);
		const payments = await this.repository.list(userId);
		return this.build(userId, payments, from, to, today);
	}

	async reminders(
		userId: string,
		today = todayIso(),
	): Promise<PlannedReminder[]> {
		const payments = (await this.repository.list(userId)).filter(
			(p) => p.remindDays !== null,
		);
		const occurrences = await this.build(
			userId,
			payments,
			addDays(today, -OVERDUE_REMINDER_DAYS),
			addDays(today, 30),
			today,
		);
		const remindDays = new Map(payments.map((p) => [p.id, p.remindDays ?? 0]));
		return occurrences
			.filter(
				(o) =>
					(o.status === "overdue" ||
						o.status === "due" ||
						o.status === "scheduled") &&
					daysBetween(today, o.dueDate) <= (remindDays.get(o.paymentId) ?? 0),
			)
			.map((o) => ({
				key: `${o.paymentId}|${o.dueDate}|${today}`,
				paymentId: o.paymentId,
				dueDate: o.dueDate,
				title: reminderTitle(o.name, o.dueDate, today),
				body: `${formatMZN(o.amount)} MZN`,
				overdue: o.status === "overdue",
			}));
	}

	async confirm(
		userId: string,
		id: string,
		input: ConfirmPlannedPaymentInput,
	): Promise<PlannedOccurrence> {
		const payment = await this.find(userId, id);
		if (payment.archived)
			throw conflict("PAYMENT_ARCHIVED", "Este pagamento está arquivado");
		this.assertDue(payment, input.dueDate);
		const [event] = await this.repository.events(
			userId,
			[id],
			input.dueDate,
			input.dueDate,
		);
		if (isPaid(event))
			throw conflict("ALREADY_PAID", "Este pagamento já foi confirmado");
		if (event) await this.repository.deleteEvent(userId, id, input.dueDate);

		const accountId = input.accountId ?? payment.accountId;
		if (!accountId)
			throw unprocessable("ACCOUNT_REQUIRED", "Escolha a conta que paga");
		const month = input.dueDate.slice(0, 7);
		const [monthItem] = payment.planItemId
			? await this.repository.monthItems(userId, [payment.planItemId], [month])
			: [];
		const common = {
			amount: input.amount ?? payment.amount,
			occurredAt: input.occurredAt ?? new Date(),
			referenceMonth: month,
			note: payment.name,
			monthItemId: monthItem?.id ?? null,
		};

		if (payment.kind === "transfer") {
			if (!payment.toAccountId)
				throw unprocessable(
					"TO_ACCOUNT_REQUIRED",
					"Escolha a conta de destino",
				);
			const transfer = await this.deps.transactions.createTransfer(userId, {
				...common,
				fromAccountId: accountId,
				toAccountId: payment.toAccountId,
			});
			await this.repository.insertEvent({
				userId,
				paymentId: id,
				dueDate: input.dueDate,
				status: "paid",
				transferId: transfer.id,
			});
		} else {
			const tx = await this.deps.transactions.create(userId, {
				...common,
				type: "expense",
				accountId,
				categoryId: payment.categoryId,
			});
			await this.repository.insertEvent({
				userId,
				paymentId: id,
				dueDate: input.dueDate,
				status: "paid",
				transactionId: tx.id,
			});
		}
		return this.occurrence(userId, payment, input.dueDate);
	}

	async skip(
		userId: string,
		id: string,
		dueDate: string,
	): Promise<PlannedOccurrence> {
		const payment = await this.find(userId, id);
		this.assertDue(payment, dueDate);
		const [event] = await this.repository.events(
			userId,
			[id],
			dueDate,
			dueDate,
		);
		if (isPaid(event))
			throw conflict(
				"ALREADY_PAID",
				"Este pagamento já foi confirmado; desfaça-o primeiro",
			);
		if (event) await this.repository.deleteEvent(userId, id, dueDate);
		await this.repository.insertEvent({
			userId,
			paymentId: id,
			dueDate,
			status: "skipped",
		});
		return this.occurrence(userId, payment, dueDate);
	}

	async undo(
		userId: string,
		id: string,
		dueDate: string,
	): Promise<PlannedOccurrence> {
		const payment = await this.find(userId, id);
		const [event] = await this.repository.events(
			userId,
			[id],
			dueDate,
			dueDate,
		);
		if (!event) throw notFound("Pagamento confirmado");
		await this.repository.deleteEvent(userId, id, dueDate);
		if (event.transactionId)
			await this.deps.transactions.remove(userId, event.transactionId);
		if (event.transferId)
			await this.deps.transactions.removeTransfer(userId, event.transferId);
		return this.occurrence(userId, payment, dueDate);
	}

	private async occurrence(
		userId: string,
		payment: PlannedPaymentWithPlan,
		dueDate: string,
	) {
		const [occurrence] = await this.build(
			userId,
			[payment],
			dueDate,
			dueDate,
			todayIso(),
		);
		return occurrence!;
	}

	private async build(
		userId: string,
		payments: PlannedPaymentWithPlan[],
		from: string,
		to: string,
		today: string,
	): Promise<PlannedOccurrence[]> {
		const dated = payments.flatMap((payment) =>
			dueDates(payment, from, to).map((dueDate) => ({ payment, dueDate })),
		);
		const events = await this.repository.events(
			userId,
			payments.map((p) => p.id),
			from,
			to,
		);
		const byKey = new Map(
			events.map((e) => [`${e.paymentId}|${e.dueDate}`, e]),
		);
		const planItemIds = [
			...new Set(payments.flatMap((p) => (p.planItemId ? [p.planItemId] : []))),
		];
		const months = [...new Set(dated.map((d) => d.dueDate.slice(0, 7)))];
		const items = await this.repository.monthItems(userId, planItemIds, months);
		const itemOf = new Map(
			items.map((i) => [`${i.planItemId}|${i.month}`, i.id]),
		);

		return dated
			.map(({ payment, dueDate }) => {
				const event = byKey.get(`${payment.id}|${dueDate}`);
				const status = statusOf(dueDate, today, event);
				const paid = status === "paid" ? event?.paid : null;
				return {
					paymentId: payment.id,
					dueDate,
					status,
					daysLate: status === "overdue" ? daysBetween(dueDate, today) : 0,
					name: payment.name,
					kind: payment.kind,
					amount: payment.amount,
					accountId: payment.accountId,
					toAccountId: payment.toAccountId,
					categoryId: payment.categoryId,
					frequency: payment.frequency,
					transactionId:
						status === "paid" ? (event?.transactionId ?? null) : null,
					transferId: status === "paid" ? (event?.transferId ?? null) : null,
					paidAmount: paid?.amount ?? null,
					paidAt: paid?.occurredAt.toISOString() ?? null,
					paidAccountId: paid?.accountId ?? null,
					monthItemId: payment.planItemId
						? (itemOf.get(`${payment.planItemId}|${dueDate.slice(0, 7)}`) ??
							null)
						: null,
				};
			})
			.sort(
				(a, b) =>
					a.dueDate.localeCompare(b.dueDate) ||
					a.name.localeCompare(b.name, "pt"),
			);
	}

	private assertDue(payment: PlannedPaymentWithPlan, dueDate: string) {
		if (dueDates(payment, dueDate, dueDate).length === 0)
			throw unprocessable(
				"NOT_A_DUE_DATE",
				"Esta data não é um vencimento deste pagamento",
			);
	}

	private async assertRefs(
		userId: string,
		input: {
			accountId?: string;
			toAccountId?: string | null;
			categoryId?: string | null;
			planItemId?: string | null;
		},
	) {
		const accountIds = [input.accountId, input.toAccountId].filter(
			(v): v is string => !!v,
		);
		if (accountIds.length)
			await this.deps.accounts.assertOwned(userId, accountIds);
		if (input.categoryId)
			await this.deps.categories.assertOwned(userId, [input.categoryId]);
		if (
			input.planItemId &&
			!(await this.repository.planItemOwned(userId, input.planItemId))
		)
			throw notFound("Item do plano");
	}

	private async find(userId: string, id: string) {
		const [row] = await this.repository.list(userId, { id });
		if (!row) throw notFound("Pagamento planeado");
		return row;
	}
}
