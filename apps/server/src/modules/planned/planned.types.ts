import type {
	plannedPaymentEvents,
	plannedPayments,
} from "@wallet/db/schema/planned";
import type {
	CreateTransactionInput,
	CreateTransferInput,
} from "@wallet/shared";

export type PlannedPaymentRow = typeof plannedPayments.$inferSelect;
export type NewPlannedPaymentRow = typeof plannedPayments.$inferInsert;
export type PlannedEventRow = typeof plannedPaymentEvents.$inferSelect;

export type PlannedPaymentWithPlan = PlannedPaymentRow & {
	planItemName: string | null;
};

export type PlannedEventWithPayment = PlannedEventRow & {
	paid: { amount: number; occurredAt: Date; accountId: string } | null;
};

export type PlannedDeps = {
	accounts: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
	categories: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
	transactions: {
		create(
			userId: string,
			input: CreateTransactionInput,
		): Promise<{ id: string }>;
		remove(userId: string, id: string): Promise<void>;
		createTransfer(
			userId: string,
			input: CreateTransferInput,
		): Promise<{ id: string }>;
		removeTransfer(userId: string, id: string): Promise<void>;
	};
};
