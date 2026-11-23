import type { Database, DbExecutor } from "@wallet/db";
import { transactions, transfers } from "@wallet/db/schema/transactions";
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
	ne,
	or,
	sql,
	sum,
} from "drizzle-orm";

import type {
	ITransactionsRepository,
	LinkedPayment,
	ListFilters,
	NewTransactionRow,
	NewTransferRow,
} from "./transactions.types";

const columns = {
	tx: transactions,
	counterpartAccountId: sql<string | null>`case
    when ${transfers.id} is null then null
    when ${transactions.amount} < 0 then ${transfers.toAccountId}
    else ${transfers.fromAccountId} end`,
};

const owned = (userId: string, id: string) =>
	and(eq(transactions.userId, userId), eq(transactions.id, id));

const incomeOrExpense = inArray(transactions.type, ["expense", "income"]);

const like = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size)
		out.push(items.slice(i, i + size));
	return out;
}

export class TransactionsRepository implements ITransactionsRepository {
	constructor(private readonly db: Database) {}

	async findById(userId: string, id: string, exec: DbExecutor = this.db) {
		const [row] = await exec
			.select(columns)
			.from(transactions)
			.leftJoin(transfers, eq(transactions.transferId, transfers.id))
			.where(owned(userId, id));
		return row;
	}

	list(userId: string, f: ListFilters) {
		return this.db
			.select(columns)
			.from(transactions)
			.leftJoin(transfers, eq(transactions.transferId, transfers.id))
			.where(
				and(
					eq(transactions.userId, userId),
					f.from ? gte(transactions.occurredAt, f.from) : undefined,
					f.to ? lt(transactions.occurredAt, f.to) : undefined,
					f.accountId?.length
						? inArray(transactions.accountId, f.accountId)
						: undefined,
					f.categoryIds
						? inArray(transactions.categoryId, f.categoryIds)
						: undefined,
					f.type ? eq(transactions.type, f.type) : undefined,
					f.referenceMonth
						? eq(transactions.referenceMonth, f.referenceMonth)
						: undefined,
					f.payee ? ilike(transactions.payee, f.payee) : undefined,
					f.q
						? or(
								ilike(transactions.note, like(f.q)),
								ilike(transactions.payee, like(f.q)),
							)
						: undefined,
					f.cursor
						? or(
								lt(transactions.occurredAt, f.cursor.occurredAt),
								and(
									eq(transactions.occurredAt, f.cursor.occurredAt),
									lt(transactions.id, f.cursor.id),
								),
							)
						: undefined,
				),
			)
			.orderBy(desc(transactions.occurredAt), desc(transactions.id))
			.limit(f.limit + 1);
	}

	async insert(row: NewTransactionRow) {
		const [created] = await this.db
			.insert(transactions)
			.values(row)
			.returning({ id: transactions.id });
		return created!.id;
	}

	async update(userId: string, id: string, set: Partial<NewTransactionRow>) {
		await this.db.update(transactions).set(set).where(owned(userId, id));
	}

	async delete(userId: string, id: string) {
		await this.db.delete(transactions).where(owned(userId, id));
	}

	async findTransfer(userId: string, id: string, exec: DbExecutor = this.db) {
		const [row] = await exec
			.select()
			.from(transfers)
			.where(and(eq(transfers.userId, userId), eq(transfers.id, id)));
		return row;
	}

	transferLegs(transferId: string, exec: DbExecutor = this.db) {
		return exec
			.select()
			.from(transactions)
			.where(eq(transactions.transferId, transferId));
	}

	insertTransfer(
		transfer: NewTransferRow,
		legs: Omit<NewTransactionRow, "transferId">[],
	) {
		return this.db.transaction(async (tx) => {
			const [created] = await tx
				.insert(transfers)
				.values(transfer)
				.returning({ id: transfers.id });
			await tx
				.insert(transactions)
				.values(legs.map((l) => ({ ...l, transferId: created!.id })));
			return created!.id;
		});
	}

	async updateTransfer(
		id: string,
		set: Partial<NewTransferRow>,
		outLeg: { id: string; set: Partial<NewTransactionRow> },
		inLeg: { id: string; set: Partial<NewTransactionRow> },
	) {
		await this.db.transaction(async (tx) => {
			await tx.update(transfers).set(set).where(eq(transfers.id, id));
			await tx
				.update(transactions)
				.set(outLeg.set)
				.where(eq(transactions.id, outLeg.id));
			await tx
				.update(transactions)
				.set(inLeg.set)
				.where(eq(transactions.id, inLeg.id));
		});
	}

	async deleteTransfer(userId: string, id: string) {
		await this.db
			.delete(transfers)
			.where(and(eq(transfers.userId, userId), eq(transfers.id, id)));
	}

	async wipe(userId: string, exec: DbExecutor = this.db) {
		const removed = await exec
			.delete(transactions)
			.where(eq(transactions.userId, userId))
			.returning({ id: transactions.id });
		await exec.delete(transfers).where(eq(transfers.userId, userId));
		return removed.length;
	}

	async linkedPayments(
		userId: string,
		monthItemIds: string[],
	): Promise<LinkedPayment[]> {
		const rows = await this.db
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
	}

	unlinkedOutByMonth(userId: string, months: string[]) {
		return this.db
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
					ne(transactions.type, "adjustment"),
				),
			)
			.groupBy(
				transactions.referenceMonth,
				transactions.categoryId,
				transactions.type,
			);
	}

	incomeByMonth(userId: string, months: string[]) {
		return this.db
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
			.groupBy(transactions.referenceMonth);
	}

	statsByAccount(userId: string, accountIds?: string[]) {
		return this.db
			.select({
				accountId: transactions.accountId,
				sum: sum(transactions.amount),
				count: count(),
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					accountIds ? inArray(transactions.accountId, accountIds) : undefined,
				),
			)
			.groupBy(transactions.accountId);
	}

	dailyTotals(userId: string, from: Date, to: Date) {
		const day = sql<string>`to_char(${transactions.occurredAt} at time zone 'Africa/Maputo', 'YYYY-MM-DD')`;
		return this.db
			.select({
				day,
				income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.amount} > 0), 0)`,
				expense: sql<string>`coalesce(-sum(${transactions.amount}) filter (where ${transactions.amount} < 0), 0)`,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					incomeOrExpense,
					gte(transactions.occurredAt, from),
					lt(transactions.occurredAt, to),
				),
			)
			.groupBy(day)
			.orderBy(day);
	}

	async netBefore(userId: string, at: Date) {
		const [row] = await this.db
			.select({ total: sum(transactions.amount) })
			.from(transactions)
			.where(
				and(eq(transactions.userId, userId), lt(transactions.occurredAt, at)),
			);
		return Number(row?.total ?? 0);
	}

	categoryTotals(userId: string, from: Date, to: Date) {
		return this.db
			.select({
				categoryId: transactions.categoryId,
				income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.amount} > 0), 0)`,
				expense: sql<string>`coalesce(-sum(${transactions.amount}) filter (where ${transactions.amount} < 0), 0)`,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					incomeOrExpense,
					gte(transactions.occurredAt, from),
					lt(transactions.occurredAt, to),
				),
			)
			.groupBy(transactions.categoryId);
	}

	accountTotals(userId: string, from: Date, to: Date) {
		return this.db
			.select({
				accountId: transactions.accountId,
				income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.amount} > 0), 0)`,
				expense: sql<string>`coalesce(-sum(${transactions.amount}) filter (where ${transactions.amount} < 0), 0)`,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					incomeOrExpense,
					gte(transactions.occurredAt, from),
					lt(transactions.occurredAt, to),
				),
			)
			.groupBy(transactions.accountId);
	}

	countByCategory(userId: string) {
		return this.db
			.select({ categoryId: transactions.categoryId, count: count() })
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					isNotNull(transactions.categoryId),
				),
			)
			.groupBy(transactions.categoryId);
	}

	async existingImportHashes(
		userId: string,
		hashes: string[],
		exec: DbExecutor = this.db,
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
	}

	async insertTransfers(exec: DbExecutor, rows: NewTransferRow[]) {
		for (const part of chunk(rows, 500))
			await exec.insert(transfers).values(part);
	}

	async insertTransactions(exec: DbExecutor, rows: NewTransactionRow[]) {
		for (const part of chunk(rows, 500))
			await exec.insert(transactions).values(part);
	}

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
	}
}
