import type { Database, DbExecutor } from "@wallet/db";
import { transactions, transfers } from "@wallet/db/schema/transactions";
import {
	type CreateTransactionInput,
	type CreateTransferInput,
	type ListTransactionsQuery,
	type Transaction,
	type TransactionPage,
	type Transfer,
	type UpdateTransactionInput,
	type UpdateTransferInput,
	yearMonthOf,
} from "@wallet/shared";
import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNotNull,
	lt,
	or,
	sql,
	sum,
} from "drizzle-orm";

import { decodeCursor, encodeCursor } from "../../lib/cursor";
import { conflict, notFound, unprocessable } from "../../lib/errors";

/** What this module needs from accounts and categories, without importing those modules. */
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
		/** The given ids plus their subcategories. */
		withDescendants(userId: string, ids: string[]): Promise<string[]>;
		transferCategoryId(userId: string, exec?: DbExecutor): Promise<string>;
	};
	budgets: {
		/** Throws unless the month item belongs to this user. */
		assertMonthItemOwned(userId: string, id: string): Promise<void>;
	};
};

/** A transaction linked to a month item, as the budget module sees it. */
export type LinkedPayment = {
	transactionId: string;
	monthItemId: string;
	transferId: string | null;
	accountId: string;
	/** Signed centavos. */
	amount: number;
	occurredAt: Date;
	note: string | null;
};

/** A row the importer has already resolved to app ids. */
export type ImportedTransaction = {
	accountId: string;
	categoryId: string | null;
	type: "expense" | "income";
	/** Signed centavos. */
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
	/** Positive centavos. */
	amount: number;
	occurredAt: Date;
	referenceMonth: string;
	note: string | null;
	outHash: string;
	inHash: string;
};

type Row = typeof transactions.$inferSelect;

const columns = {
	tx: transactions,
	counterpartAccountId: sql<string | null>`case
    when ${transfers.id} is null then null
    when ${transactions.amount} < 0 then ${transfers.toAccountId}
    else ${transfers.fromAccountId} end`,
};

function toTransaction({
	tx,
	counterpartAccountId,
}: {
	tx: Row;
	counterpartAccountId: string | null;
}): Transaction {
	return {
		id: tx.id,
		type: tx.type,
		accountId: tx.accountId,
		categoryId: tx.categoryId,
		amount: tx.amount,
		occurredAt: tx.occurredAt.toISOString(),
		referenceMonth: tx.referenceMonth,
		note: tx.note,
		payee: tx.payee,
		transferId: tx.transferId,
		counterpartAccountId,
		importBatchId: tx.importBatchId,
		monthItemId: tx.monthItemId,
		createdAt: tx.createdAt.toISOString(),
	};
}

const signed = (type: "expense" | "income", amount: number) =>
	type === "expense" ? -amount : amount;

/** Keep a reference month that just followed the date; keep one the user set apart from it. */
function nextReferenceMonth(
	current: { referenceMonth: string; occurredAt: Date },
	occurredAt?: Date,
	explicit?: string,
) {
	if (explicit) return explicit;
	if (occurredAt && current.referenceMonth === yearMonthOf(current.occurredAt))
		return yearMonthOf(occurredAt);
	return current.referenceMonth;
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size)
		out.push(items.slice(i, i + size));
	return out;
}

export function createTransactionsService(
	db: Database,
	deps: TransactionsDeps,
) {
	async function findRow(userId: string, id: string, exec: DbExecutor = db) {
		const [row] = await exec
			.select(columns)
			.from(transactions)
			.leftJoin(transfers, eq(transactions.transferId, transfers.id))
			.where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
		if (!row) throw notFound("Transacção");
		return row;
	}

	async function findTransfer(
		userId: string,
		id: string,
		exec: DbExecutor = db,
	): Promise<Transfer> {
		const [transfer] = await exec
			.select()
			.from(transfers)
			.where(and(eq(transfers.userId, userId), eq(transfers.id, id)));
		if (!transfer) throw notFound("Transferência");
		const legs = await exec
			.select()
			.from(transactions)
			.where(eq(transactions.transferId, id));
		const out = legs.find((l) => l.amount < 0);
		const inn = legs.find((l) => l.amount > 0);
		if (!out || !inn)
			throw conflict("BROKEN_TRANSFER", "Transferência sem as duas pernas");
		return {
			id: transfer.id,
			fromAccountId: transfer.fromAccountId,
			toAccountId: transfer.toAccountId,
			amount: transfer.amount,
			occurredAt: transfer.occurredAt.toISOString(),
			referenceMonth: out.referenceMonth,
			note: out.note,
			monthItemId: out.monthItemId,
			legs: { outId: out.id, inId: inn.id },
		};
	}

	const service = {
		async list(
			userId: string,
			query: ListTransactionsQuery,
		): Promise<TransactionPage> {
			const categoryIds = query.categoryId?.length
				? await deps.categories.withDescendants(userId, query.categoryId)
				: undefined;
			const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
			const like = (text: string) =>
				`%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

			const rows = await db
				.select(columns)
				.from(transactions)
				.leftJoin(transfers, eq(transactions.transferId, transfers.id))
				.where(
					and(
						eq(transactions.userId, userId),
						query.from ? gte(transactions.occurredAt, query.from) : undefined,
						query.to ? lt(transactions.occurredAt, query.to) : undefined,
						query.accountId?.length
							? inArray(transactions.accountId, query.accountId)
							: undefined,
						categoryIds
							? inArray(transactions.categoryId, categoryIds)
							: undefined,
						query.type ? eq(transactions.type, query.type) : undefined,
						query.referenceMonth
							? eq(transactions.referenceMonth, query.referenceMonth)
							: undefined,
						query.payee ? ilike(transactions.payee, query.payee) : undefined,
						query.q
							? or(
									ilike(transactions.note, like(query.q)),
									ilike(transactions.payee, like(query.q)),
								)
							: undefined,
						cursor
							? or(
									lt(transactions.occurredAt, cursor.occurredAt),
									and(
										eq(transactions.occurredAt, cursor.occurredAt),
										lt(transactions.id, cursor.id),
									),
								)
							: undefined,
					),
				)
				.orderBy(desc(transactions.occurredAt), desc(transactions.id))
				.limit(query.limit + 1);

			const page = rows.slice(0, query.limit);
			const last = page.at(-1);
			return {
				items: page.map(toTransaction),
				nextCursor:
					rows.length > query.limit && last
						? encodeCursor({ occurredAt: last.tx.occurredAt, id: last.tx.id })
						: null,
			};
		},

		async get(userId: string, id: string) {
			return toTransaction(await findRow(userId, id));
		},

		async create(userId: string, input: CreateTransactionInput) {
			await deps.accounts.assertOwned(userId, [input.accountId]);
			if (input.categoryId)
				await deps.categories.assertOwned(userId, [input.categoryId]);
			if (input.monthItemId)
				await deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
			const [row] = await db
				.insert(transactions)
				.values({
					userId,
					accountId: input.accountId,
					categoryId: input.categoryId,
					type: input.type,
					amount: signed(input.type, input.amount),
					occurredAt: input.occurredAt,
					referenceMonth: input.referenceMonth ?? yearMonthOf(input.occurredAt),
					note: input.note ?? null,
					payee: input.payee ?? null,
					monthItemId: input.monthItemId ?? null,
				})
				.returning({ id: transactions.id });
			return service.get(userId, row!.id);
		},

		async update(userId: string, id: string, input: UpdateTransactionInput) {
			const { tx } = await findRow(userId, id);
			if (tx.type === "transfer") {
				throw conflict(
					"IS_TRANSFER",
					"Esta transacção é parte de uma transferência; edite-a em /transfers",
					{
						transferId: tx.transferId,
					},
				);
			}
			if (input.accountId)
				await deps.accounts.assertOwned(userId, [input.accountId]);
			if (input.categoryId)
				await deps.categories.assertOwned(userId, [input.categoryId]);
			if (input.monthItemId)
				await deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
			const type = input.type ?? tx.type;
			const amount = input.amount ?? Math.abs(tx.amount);
			await db
				.update(transactions)
				.set({
					accountId: input.accountId,
					categoryId: input.categoryId,
					type,
					amount: signed(type, amount),
					occurredAt: input.occurredAt,
					referenceMonth: nextReferenceMonth(
						tx,
						input.occurredAt,
						input.referenceMonth,
					),
					note: input.note,
					payee: input.payee,
					monthItemId: input.monthItemId,
				})
				.where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
			return service.get(userId, id);
		},

		/** Deleting one leg of a transfer deletes the whole transfer. */
		async remove(userId: string, id: string) {
			const { tx } = await findRow(userId, id);
			if (tx.transferId) {
				await db
					.delete(transfers)
					.where(
						and(eq(transfers.userId, userId), eq(transfers.id, tx.transferId)),
					);
			} else {
				await db
					.delete(transactions)
					.where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
			}
		},

		async createTransfer(userId: string, input: CreateTransferInput) {
			await deps.accounts.assertOwned(userId, [
				input.fromAccountId,
				input.toAccountId,
			]);
			const categoryId = await deps.categories.transferCategoryId(userId);
			if (input.monthItemId)
				await deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
			const referenceMonth =
				input.referenceMonth ?? yearMonthOf(input.occurredAt);
			const id = await db.transaction(async (tx) => {
				const [transfer] = await tx
					.insert(transfers)
					.values({
						userId,
						fromAccountId: input.fromAccountId,
						toAccountId: input.toAccountId,
						amount: input.amount,
						occurredAt: input.occurredAt,
					})
					.returning({ id: transfers.id });
				const leg = {
					userId,
					categoryId,
					type: "transfer" as const,
					occurredAt: input.occurredAt,
					referenceMonth,
					note: input.note ?? null,
					transferId: transfer!.id,
				};
				await tx.insert(transactions).values([
					{
						...leg,
						accountId: input.fromAccountId,
						amount: -input.amount,
						monthItemId: input.monthItemId ?? null,
					},
					{ ...leg, accountId: input.toAccountId, amount: input.amount },
				]);
				return transfer!.id;
			});
			return findTransfer(userId, id);
		},

		async getTransfer(userId: string, id: string) {
			return findTransfer(userId, id);
		},

		async updateTransfer(
			userId: string,
			id: string,
			input: UpdateTransferInput,
		) {
			const current = await findTransfer(userId, id);
			const fromAccountId = input.fromAccountId ?? current.fromAccountId;
			const toAccountId = input.toAccountId ?? current.toAccountId;
			if (fromAccountId === toAccountId) {
				throw unprocessable(
					"SAME_ACCOUNT",
					"A conta de origem e a de destino têm de ser diferentes",
				);
			}
			await deps.accounts.assertOwned(userId, [fromAccountId, toAccountId]);
			if (input.monthItemId)
				await deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
			const amount = input.amount ?? current.amount;
			const occurredAt = input.occurredAt ?? new Date(current.occurredAt);
			const referenceMonth = nextReferenceMonth(
				{
					referenceMonth: current.referenceMonth,
					occurredAt: new Date(current.occurredAt),
				},
				input.occurredAt,
				input.referenceMonth,
			);
			await db.transaction(async (tx) => {
				await tx
					.update(transfers)
					.set({ fromAccountId, toAccountId, amount, occurredAt })
					.where(eq(transfers.id, id));
				const shared = { occurredAt, referenceMonth, note: input.note };
				await tx
					.update(transactions)
					.set({
						...shared,
						accountId: fromAccountId,
						amount: -amount,
						monthItemId: input.monthItemId,
					})
					.where(eq(transactions.id, current.legs.outId));
				await tx
					.update(transactions)
					.set({ ...shared, accountId: toAccountId, amount })
					.where(eq(transactions.id, current.legs.inId));
			});
			return findTransfer(userId, id);
		},

		async removeTransfer(userId: string, id: string) {
			await findTransfer(userId, id);
			await db
				.delete(transfers)
				.where(and(eq(transfers.userId, userId), eq(transfers.id, id)));
		},

		// ---- Used by other modules ----

		/** Transactions that pay the given month items, newest first. */
		async linkedPayments(
			userId: string,
			monthItemIds: string[],
		): Promise<LinkedPayment[]> {
			if (monthItemIds.length === 0) return [];
			const rows = await db
				.select({
					transactionId: transactions.id,
					monthItemId: transactions.monthItemId,
					transferId: transactions.transferId,
					accountId: transactions.accountId,
					amount: transactions.amount,
					occurredAt: transactions.occurredAt,
					note: transactions.note,
				})
				.from(transactions)
				.where(
					and(
						eq(transactions.userId, userId),
						inArray(transactions.monthItemId, monthItemIds),
					),
				)
				.orderBy(desc(transactions.occurredAt), desc(transactions.id));
			return rows.map((r) => ({ ...r, monthItemId: r.monthItemId! }));
		},

		/**
		 * Per budget month: money out that pays no list item (by category, for matching) and income received.
		 * Transfer legs count as money out only when they leave an account (savings paid from elsewhere).
		 */
		async monthActivity(userId: string, months: string[]) {
			if (months.length === 0)
				return { unlinkedOut: [], income: new Map<string, number>() };
			const [outRows, incomeRows] = await Promise.all([
				db
					.select({
						month: transactions.referenceMonth,
						categoryId: transactions.categoryId,
						type: transactions.type,
						sum: sum(transactions.amount),
					})
					.from(transactions)
					.where(
						and(
							eq(transactions.userId, userId),
							inArray(transactions.referenceMonth, months),
							sql`${transactions.monthItemId} is null`,
							lt(transactions.amount, 0),
						),
					)
					.groupBy(
						transactions.referenceMonth,
						transactions.categoryId,
						transactions.type,
					),
				db
					.select({
						month: transactions.referenceMonth,
						sum: sum(transactions.amount),
					})
					.from(transactions)
					.where(
						and(
							eq(transactions.userId, userId),
							inArray(transactions.referenceMonth, months),
							eq(transactions.type, "income"),
						),
					)
					.groupBy(transactions.referenceMonth),
			]);
			return {
				unlinkedOut: outRows.map((r) => ({
					month: r.month,
					categoryId: r.categoryId,
					type: r.type,
					/** Positive centavos. */
					spent: -Number(r.sum ?? 0),
				})),
				income: new Map(incomeRows.map((r) => [r.month, Number(r.sum ?? 0)])),
			};
		},

		async statsByAccount(userId: string, accountIds?: string[]) {
			if (accountIds && accountIds.length === 0)
				return new Map<string, { sum: number; count: number }>();
			const rows = await db
				.select({
					accountId: transactions.accountId,
					sum: sum(transactions.amount),
					count: count(),
				})
				.from(transactions)
				.where(
					and(
						eq(transactions.userId, userId),
						accountIds
							? inArray(transactions.accountId, accountIds)
							: undefined,
					),
				)
				.groupBy(transactions.accountId);
			return new Map(
				rows.map((r) => [
					r.accountId,
					{ sum: Number(r.sum ?? 0), count: r.count },
				]),
			);
		},

		async countByCategory(userId: string) {
			const rows = await db
				.select({ categoryId: transactions.categoryId, count: count() })
				.from(transactions)
				.where(
					and(
						eq(transactions.userId, userId),
						isNotNull(transactions.categoryId),
					),
				)
				.groupBy(transactions.categoryId);
			return new Map(rows.map((r) => [r.categoryId!, r.count]));
		},

		async existingImportHashes(
			userId: string,
			hashes: string[],
			exec: DbExecutor = db,
		) {
			const found = new Set<string>();
			for (const part of chunk([...new Set(hashes)], 1000)) {
				const rows = await exec
					.select({ hash: transactions.importHash })
					.from(transactions)
					.where(
						and(
							eq(transactions.userId, userId),
							inArray(transactions.importHash, part),
						),
					);
				for (const r of rows) if (r.hash) found.add(r.hash);
			}
			return found;
		},

		/** Writes an import inside the caller's transaction. */
		async insertImported(
			exec: DbExecutor,
			userId: string,
			importBatchId: string,
			data: {
				transactions: ImportedTransaction[];
				transfers: ImportedTransfer[];
			},
		) {
			const transferValues = data.transfers.map((t) => ({
				...t,
				id: crypto.randomUUID(),
			}));
			for (const part of chunk(transferValues, 500)) {
				await exec.insert(transfers).values(
					part.map((t) => ({
						id: t.id,
						userId,
						fromAccountId: t.fromAccountId,
						toAccountId: t.toAccountId,
						amount: t.amount,
						occurredAt: t.occurredAt,
						importBatchId,
					})),
				);
			}
			const legs = transferValues.flatMap((t) => {
				const leg = {
					userId,
					categoryId: t.categoryId,
					type: "transfer" as const,
					occurredAt: t.occurredAt,
					referenceMonth: t.referenceMonth,
					note: t.note,
					transferId: t.id,
					importBatchId,
				};
				return [
					{
						...leg,
						accountId: t.fromAccountId,
						amount: -t.amount,
						importHash: t.outHash,
					},
					{
						...leg,
						accountId: t.toAccountId,
						amount: t.amount,
						importHash: t.inHash,
					},
				];
			});
			const plain = data.transactions.map((t) => ({
				...t,
				userId,
				importBatchId,
			}));
			for (const part of chunk([...legs, ...plain], 500)) {
				await exec.insert(transactions).values(part);
			}
			return {
				transactions: plain.length + legs.length,
				transfers: transferValues.length,
			};
		},

		async deleteByImportBatch(
			exec: DbExecutor,
			userId: string,
			importBatchId: string,
		) {
			const removedTransfers = await exec
				.delete(transfers)
				.where(
					and(
						eq(transfers.userId, userId),
						eq(transfers.importBatchId, importBatchId),
					),
				)
				.returning({ id: transfers.id });
			const removed = await exec
				.delete(transactions)
				.where(
					and(
						eq(transactions.userId, userId),
						eq(transactions.importBatchId, importBatchId),
					),
				)
				.returning({ id: transactions.id });
			return {
				transfers: removedTransfers.length,
				transactions: removed.length + removedTransfers.length * 2,
			};
		},
	};
	return service;
}

export type TransactionsService = ReturnType<typeof createTransactionsService>;
