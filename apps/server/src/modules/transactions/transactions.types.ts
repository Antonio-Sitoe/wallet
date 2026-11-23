import type { DbExecutor } from "@wallet/db";
import type { transactions, transfers } from "@wallet/db/schema/transactions";

import type { Cursor } from "../../shared/utils/cursor";
import type { ListTransactionsQuery } from "./transactions.schema";

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type TransferRow = typeof transfers.$inferSelect;
export type NewTransferRow = typeof transfers.$inferInsert;

export type TransactionWithCounterpart = {
	tx: TransactionRow;
	counterpartAccountId: string | null;
};

export type TransactionsDeps = {
	accounts: {
		assertOwned(
			userId: string,
			ids: string[],
			exec?: DbExecutor,
		): Promise<void>;
	};
	categories: {
		assertOwned(
			userId: string,
			ids: string[],
			exec?: DbExecutor,
		): Promise<void>;
		withDescendants(userId: string, ids: string[]): Promise<string[]>;
		transferCategoryId(userId: string, exec?: DbExecutor): Promise<string>;
	};
	budgets: {
		assertMonthItemOwned(userId: string, id: string): Promise<void>;
	};
};

export type LinkedPayment = {
	transactionId: string;
	monthItemId: string;
	transferId: string | null;
	accountId: string;
	amount: number;
	occurredAt: Date;
	note: string | null;
};

export type ImportedTransaction = {
	accountId: string;
	categoryId: string | null;
	type: "expense" | "income";
	amount: number;
	occurredAt: Date;
	referenceMonth: string;
	note: string | null;
	payee: string | null;
	labels: string[];
	paymentType: string | null;
	currency: string;
	refAmount: number | null;
	importHash: string;
};

export type ImportedTransfer = {
	fromAccountId: string;
	toAccountId: string;
	categoryId: string | null;
	amount: number;
	occurredAt: Date;
	referenceMonth: string;
	note: string | null;
	outHash: string;
	inHash: string;
};

export type ListFilters = Omit<
	ListTransactionsQuery,
	"categoryId" | "cursor"
> & {
	categoryIds?: string[];
	cursor?: Cursor;
};

export type LegValues = Omit<NewTransactionRow, "accountId" | "amount">;

export interface ITransactionsRepository {
	findById(
		userId: string,
		id: string,
		exec?: DbExecutor,
	): Promise<TransactionWithCounterpart | undefined>;
	list(
		userId: string,
		filters: ListFilters,
	): Promise<TransactionWithCounterpart[]>;
	insert(row: NewTransactionRow): Promise<string>;
	update(
		userId: string,
		id: string,
		set: Partial<NewTransactionRow>,
	): Promise<void>;
	delete(userId: string, id: string): Promise<void>;

	findTransfer(
		userId: string,
		id: string,
		exec?: DbExecutor,
	): Promise<TransferRow | undefined>;
	transferLegs(
		transferId: string,
		exec?: DbExecutor,
	): Promise<TransactionRow[]>;
	insertTransfer(
		transfer: NewTransferRow,
		legs: Omit<NewTransactionRow, "transferId">[],
	): Promise<string>;
	updateTransfer(
		id: string,
		set: Partial<NewTransferRow>,
		outLeg: { id: string; set: Partial<NewTransactionRow> },
		inLeg: { id: string; set: Partial<NewTransactionRow> },
	): Promise<void>;
	deleteTransfer(userId: string, id: string): Promise<void>;

	wipe(userId: string, exec?: DbExecutor): Promise<number>;

	linkedPayments(
		userId: string,
		monthItemIds: string[],
	): Promise<LinkedPayment[]>;
	unlinkedOutByMonth(
		userId: string,
		months: string[],
	): Promise<
		{
			month: string;
			categoryId: string | null;
			type: TransactionRow["type"];
			sum: string | null;
		}[]
	>;
	incomeByMonth(
		userId: string,
		months: string[],
	): Promise<{ month: string; sum: string | null }[]>;
	statsByAccount(
		userId: string,
		accountIds?: string[],
	): Promise<{ accountId: string; sum: string | null; count: number }[]>;
	dailyTotals(
		userId: string,
		from: Date,
		to: Date,
	): Promise<{ day: string; income: string; expense: string }[]>;
	netBefore(userId: string, at: Date, accountId?: string): Promise<number>;
	dailyNet(
		userId: string,
		from: Date,
		to: Date,
		accountId?: string,
	): Promise<{ day: string; net: string }[]>;
	categoryTotals(
		userId: string,
		from: Date,
		to: Date,
	): Promise<{ categoryId: string | null; income: string; expense: string }[]>;
	accountTotals(
		userId: string,
		from: Date,
		to: Date,
	): Promise<{ accountId: string; income: string; expense: string }[]>;
	payeeTotals(
		userId: string,
		from: Date,
		to: Date,
	): Promise<{ key: string; name: string; income: string; expense: string }[]>;
	labelTotals(
		userId: string,
		from: Date,
		to: Date,
	): Promise<{ name: string; income: string; expense: string }[]>;
	labelUsage(userId: string): Promise<{ name: string; count: number }[]>;
	countByCategory(
		userId: string,
	): Promise<{ categoryId: string | null; count: number }[]>;

	existingImportHashes(
		userId: string,
		hashes: string[],
		exec?: DbExecutor,
	): Promise<Set<string>>;
	insertTransfers(exec: DbExecutor, rows: NewTransferRow[]): Promise<void>;
	insertTransactions(
		exec: DbExecutor,
		rows: NewTransactionRow[],
	): Promise<void>;
	deleteByImportBatch(
		exec: DbExecutor,
		userId: string,
		importBatchId: string,
	): Promise<{ transfers: number; transactions: number }>;
}
