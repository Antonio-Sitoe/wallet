import type { Database } from "@wallet/db";
import { monthItems, planItems } from "@wallet/db/schema/budgets";
import {
	plannedPaymentEvents,
	plannedPayments,
} from "@wallet/db/schema/planned";
import { transactions, transfers } from "@wallet/db/schema/transactions";
import { and, asc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";

import type { UpdatePlannedPaymentInput } from "./planned.schema";
import type {
	NewPlannedPaymentRow,
	PlannedEventWithPayment,
	PlannedPaymentRow,
	PlannedPaymentWithPlan,
} from "./planned.types";

const owned = (userId: string, id: string) =>
	and(eq(plannedPayments.userId, userId), eq(plannedPayments.id, id));

export class PlannedRepository {
	constructor(private readonly db: Database) {}

	async list(
		userId: string,
		options: { includeArchived?: boolean; id?: string } = {},
	): Promise<PlannedPaymentWithPlan[]> {
		const rows = await this.db
			.select({ payment: plannedPayments, planItemName: planItems.name })
			.from(plannedPayments)
			.leftJoin(planItems, eq(planItems.id, plannedPayments.planItemId))
			.where(
				and(
					eq(plannedPayments.userId, userId),
					options.id ? eq(plannedPayments.id, options.id) : undefined,
					options.includeArchived || options.id
						? undefined
						: eq(plannedPayments.archived, false),
				),
			)
			.orderBy(asc(plannedPayments.startDate), asc(plannedPayments.name));
		return rows.map((r) => ({ ...r.payment, planItemName: r.planItemName }));
	}

	async listAutoConfirm(): Promise<PlannedPaymentWithPlan[]> {
		const rows = await this.db
			.select({ payment: plannedPayments, planItemName: planItems.name })
			.from(plannedPayments)
			.leftJoin(planItems, eq(planItems.id, plannedPayments.planItemId))
			.where(
				and(
					isNotNull(plannedPayments.autoConfirmFrom),
					eq(plannedPayments.archived, false),
				),
			);
		return rows.map((r) => ({ ...r.payment, planItemName: r.planItemName }));
	}

	async insert(row: NewPlannedPaymentRow): Promise<PlannedPaymentRow> {
		const [created] = await this.db
			.insert(plannedPayments)
			.values(row)
			.returning();
		return created!;
	}

	async update(
		userId: string,
		id: string,
		input: Omit<UpdatePlannedPaymentInput, "autoConfirm"> & {
			autoConfirmFrom?: string | null;
		},
	) {
		await this.db.update(plannedPayments).set(input).where(owned(userId, id));
	}

	async delete(userId: string, id: string) {
		await this.db.delete(plannedPayments).where(owned(userId, id));
	}

	async events(
		userId: string,
		paymentIds: string[],
		from: string,
		to: string,
	): Promise<PlannedEventWithPayment[]> {
		if (paymentIds.length === 0) return [];
		const rows = await this.db
			.select({
				event: plannedPaymentEvents,
				txAmount: transactions.amount,
				txAt: transactions.occurredAt,
				txAccount: transactions.accountId,
				trAmount: transfers.amount,
				trAt: transfers.occurredAt,
				trAccount: transfers.fromAccountId,
			})
			.from(plannedPaymentEvents)
			.leftJoin(
				transactions,
				eq(transactions.id, plannedPaymentEvents.transactionId),
			)
			.leftJoin(transfers, eq(transfers.id, plannedPaymentEvents.transferId))
			.where(
				and(
					eq(plannedPaymentEvents.userId, userId),
					inArray(plannedPaymentEvents.paymentId, paymentIds),
					gte(plannedPaymentEvents.dueDate, from),
					lte(plannedPaymentEvents.dueDate, to),
				),
			);
		return rows.map((r) => ({
			...r.event,
			paid:
				r.txAmount !== null && r.txAt !== null && r.txAccount !== null
					? {
							amount: Math.abs(r.txAmount),
							occurredAt: r.txAt,
							accountId: r.txAccount,
						}
					: r.trAmount !== null && r.trAt !== null && r.trAccount !== null
						? { amount: r.trAmount, occurredAt: r.trAt, accountId: r.trAccount }
						: null,
		}));
	}

	async insertEvent(row: typeof plannedPaymentEvents.$inferInsert) {
		await this.db.insert(plannedPaymentEvents).values(row);
	}

	async deleteEvent(userId: string, paymentId: string, dueDate: string) {
		await this.db
			.delete(plannedPaymentEvents)
			.where(
				and(
					eq(plannedPaymentEvents.userId, userId),
					eq(plannedPaymentEvents.paymentId, paymentId),
					eq(plannedPaymentEvents.dueDate, dueDate),
				),
			);
	}

	async monthItems(userId: string, planItemIds: string[], months: string[]) {
		if (planItemIds.length === 0 || months.length === 0) return [];
		return this.db
			.select({
				id: monthItems.id,
				planItemId: monthItems.planItemId,
				month: monthItems.month,
			})
			.from(monthItems)
			.where(
				and(
					eq(monthItems.userId, userId),
					inArray(monthItems.planItemId, planItemIds),
					inArray(monthItems.month, months),
				),
			);
	}

	async planItemOwned(userId: string, id: string) {
		const [row] = await this.db
			.select({ id: planItems.id })
			.from(planItems)
			.where(and(eq(planItems.userId, userId), eq(planItems.id, id)));
		return !!row;
	}
}
