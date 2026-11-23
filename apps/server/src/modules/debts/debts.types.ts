import type { debts } from "@wallet/db/schema/debts";
import type { CreateTransactionInput } from "@wallet/shared";

export type DebtRow = typeof debts.$inferSelect;
export type NewDebtRow = typeof debts.$inferInsert;

export type DebtPaymentRow = {
	debtId: string;
	transactionId: string;
	occurredAt: Date;
	accountId: string;
	amount: number;
	note: string | null;
};

export type LoanNoteRow = {
	type: "expense" | "income" | "transfer" | "adjustment";
	amount: number;
	note: string | null;
};

export type DebtsDeps = {
	accounts: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
	categories: {
		idsBySlug(userId: string): Promise<Map<string, string>>;
	};
	transactions: {
		create(
			userId: string,
			input: CreateTransactionInput,
			options: { debtId?: string },
		): Promise<unknown>;
		remove(userId: string, id: string): Promise<void>;
	};
};
