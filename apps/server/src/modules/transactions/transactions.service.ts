import type { DbExecutor } from "@wallet/db";
import { yearMonthOf } from "@wallet/shared";

import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import { decodeCursor, encodeCursor } from "../../shared/utils/cursor";
import type {
	CreateTransactionInput,
	CreateTransferInput,
	ListTransactionsQuery,
	Transaction,
	TransactionPage,
	Transfer,
	UpdateTransactionInput,
	UpdateTransferInput,
} from "./transactions.schema";
import type {
	ImportedTransaction,
	ImportedTransfer,
	ITransactionsRepository,
	LinkedPayment,
	TransactionsDeps,
	TransactionWithCounterpart,
} from "./transactions.types";

function toTransaction({
	tx,
	counterpartAccountId,
}: TransactionWithCounterpart): Transaction {
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

export class TransactionsService {
	constructor(
		private readonly repository: ITransactionsRepository,
		private readonly deps: TransactionsDeps,
	) {}

	private async findRow(userId: string, id: string, exec?: DbExecutor) {
		const row = await this.repository.findById(userId, id, exec);
		if (!row) throw notFound("Transacção");
		return row;
	}

	private async findTransfer(
		userId: string,
		id: string,
		exec?: DbExecutor,
	): Promise<Transfer> {
		const transfer = await this.repository.findTransfer(userId, id, exec);
		if (!transfer) throw notFound("Transferência");
		const legs = await this.repository.transferLegs(id, exec);
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

	async list(
		userId: string,
		query: ListTransactionsQuery,
	): Promise<TransactionPage> {
		const { categoryId, cursor, ...filters } = query;
		const categoryIds = categoryId?.length
			? await this.deps.categories.withDescendants(userId, categoryId)
			: undefined;
		const rows = await this.repository.list(userId, {
			...filters,
			categoryIds,
			cursor: cursor ? decodeCursor(cursor) : undefined,
		});
		const page = rows.slice(0, query.limit);
		const last = page.at(-1);
		return {
			items: page.map(toTransaction),
			nextCursor:
				rows.length > query.limit && last
					? encodeCursor({ occurredAt: last.tx.occurredAt, id: last.tx.id })
					: null,
		};
	}

	async get(userId: string, id: string) {
		return toTransaction(await this.findRow(userId, id));
	}

	async create(userId: string, input: CreateTransactionInput) {
		await this.deps.accounts.assertOwned(userId, [input.accountId]);
		if (input.categoryId)
			await this.deps.categories.assertOwned(userId, [input.categoryId]);
		if (input.monthItemId)
			await this.deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
		const id = await this.repository.insert({
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
		});
		return this.get(userId, id);
	}

	async update(userId: string, id: string, input: UpdateTransactionInput) {
		const { tx } = await this.findRow(userId, id);
		if (tx.type === "adjustment") {
			throw conflict(
				"IS_ADJUSTMENT",
				"Um acerto não se edita: apague-o ou valide o saldo da conta outra vez",
			);
		}
		if (tx.type === "transfer") {
			throw conflict(
				"IS_TRANSFER",
				"Esta transacção é parte de uma transferência; edite-a em /transfers",
				{ transferId: tx.transferId },
			);
		}
		if (input.accountId)
			await this.deps.accounts.assertOwned(userId, [input.accountId]);
		if (input.categoryId)
			await this.deps.categories.assertOwned(userId, [input.categoryId]);
		if (input.monthItemId)
			await this.deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
		const type = input.type ?? (tx.type as "expense" | "income");
		const amount = input.amount ?? Math.abs(tx.amount);
		await this.repository.update(userId, id, {
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
		});
		return this.get(userId, id);
	}

	async remove(userId: string, id: string) {
		const { tx } = await this.findRow(userId, id);
		if (tx.transferId)
			await this.repository.deleteTransfer(userId, tx.transferId);
		else await this.repository.delete(userId, id);
	}

	async createTransfer(userId: string, input: CreateTransferInput) {
		await this.deps.accounts.assertOwned(userId, [
			input.fromAccountId,
			input.toAccountId,
		]);
		const categoryId = await this.deps.categories.transferCategoryId(userId);
		if (input.monthItemId)
			await this.deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
		const leg = {
			userId,
			categoryId,
			type: "transfer" as const,
			occurredAt: input.occurredAt,
			referenceMonth: input.referenceMonth ?? yearMonthOf(input.occurredAt),
			note: input.note ?? null,
		};
		const id = await this.repository.insertTransfer(
			{
				userId,
				fromAccountId: input.fromAccountId,
				toAccountId: input.toAccountId,
				amount: input.amount,
				occurredAt: input.occurredAt,
			},
			[
				{
					...leg,
					accountId: input.fromAccountId,
					amount: -input.amount,
					monthItemId: input.monthItemId ?? null,
				},
				{ ...leg, accountId: input.toAccountId, amount: input.amount },
			],
		);
		return this.findTransfer(userId, id);
	}

	async getTransfer(userId: string, id: string) {
		return this.findTransfer(userId, id);
	}

	async updateTransfer(userId: string, id: string, input: UpdateTransferInput) {
		const current = await this.findTransfer(userId, id);
		const fromAccountId = input.fromAccountId ?? current.fromAccountId;
		const toAccountId = input.toAccountId ?? current.toAccountId;
		if (fromAccountId === toAccountId) {
			throw unprocessable(
				"SAME_ACCOUNT",
				"A conta de origem e a de destino têm de ser diferentes",
			);
		}
		await this.deps.accounts.assertOwned(userId, [fromAccountId, toAccountId]);
		if (input.monthItemId)
			await this.deps.budgets.assertMonthItemOwned(userId, input.monthItemId);
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
		const shared = { occurredAt, referenceMonth, note: input.note };
		await this.repository.updateTransfer(
			id,
			{ fromAccountId, toAccountId, amount, occurredAt },
			{
				id: current.legs.outId,
				set: {
					...shared,
					accountId: fromAccountId,
					amount: -amount,
					monthItemId: input.monthItemId,
				},
			},
			{
				id: current.legs.inId,
				set: { ...shared, accountId: toAccountId, amount },
			},
		);
		return this.findTransfer(userId, id);
	}

	async removeTransfer(userId: string, id: string) {
		await this.findTransfer(userId, id);
		await this.repository.deleteTransfer(userId, id);
	}

	async createAdjustment(
		userId: string,
		input: {
			accountId: string;
			amount: number;
			occurredAt: Date;
			note?: string;
		},
	) {
		if (input.amount === 0) return null;
		return this.repository.insert({
			userId,
			accountId: input.accountId,
			type: "adjustment",
			amount: input.amount,
			occurredAt: input.occurredAt,
			referenceMonth: yearMonthOf(input.occurredAt),
			note: input.note ?? "Acerto de saldo",
		});
	}

	async wipe(userId: string, exec?: DbExecutor) {
		return this.repository.wipe(userId, exec);
	}

	async linkedPayments(
		userId: string,
		monthItemIds: string[],
	): Promise<LinkedPayment[]> {
		if (monthItemIds.length === 0) return [];
		return this.repository.linkedPayments(userId, monthItemIds);
	}

	async monthActivity(userId: string, months: string[]) {
		if (months.length === 0)
			return { unlinkedOut: [], income: new Map<string, number>() };
		const [outRows, incomeRows] = await Promise.all([
			this.repository.unlinkedOutByMonth(userId, months),
			this.repository.incomeByMonth(userId, months),
		]);
		return {
			unlinkedOut: outRows.map((r) => ({
				month: r.month,
				categoryId: r.categoryId,
				type: r.type as "expense" | "income" | "transfer",
				spent: -Number(r.sum ?? 0),
			})),
			income: new Map(incomeRows.map((r) => [r.month, Number(r.sum ?? 0)])),
		};
	}

	async statsByAccount(userId: string, accountIds?: string[]) {
		if (accountIds && accountIds.length === 0)
			return new Map<string, { sum: number; count: number }>();
		const rows = await this.repository.statsByAccount(userId, accountIds);
		return new Map(
			rows.map((r) => [
				r.accountId,
				{ sum: Number(r.sum ?? 0), count: r.count },
			]),
		);
	}

	async dailyTotals(userId: string, from: Date, to: Date) {
		const rows = await this.repository.dailyTotals(userId, from, to);
		return rows.map((r) => ({
			day: r.day,
			income: Number(r.income),
			expense: Number(r.expense),
		}));
	}

	async netBefore(userId: string, at: Date) {
		return this.repository.netBefore(userId, at);
	}

	async categoryTotals(userId: string, from: Date, to: Date) {
		const rows = await this.repository.categoryTotals(userId, from, to);
		return rows.map((r) => ({
			categoryId: r.categoryId,
			income: Number(r.income),
			expense: Number(r.expense),
		}));
	}

	async countByCategory(userId: string) {
		const rows = await this.repository.countByCategory(userId);
		return new Map(rows.map((r) => [r.categoryId!, r.count]));
	}

	async existingImportHashes(
		userId: string,
		hashes: string[],
		exec?: DbExecutor,
	) {
		return this.repository.existingImportHashes(userId, hashes, exec);
	}

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
		await this.repository.insertTransfers(
			exec,
			transferValues.map((t) => ({
				id: t.id,
				userId,
				fromAccountId: t.fromAccountId,
				toAccountId: t.toAccountId,
				amount: t.amount,
				occurredAt: t.occurredAt,
				importBatchId,
			})),
		);
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
		await this.repository.insertTransactions(exec, [...legs, ...plain]);
		return {
			transactions: plain.length + legs.length,
			transfers: transferValues.length,
		};
	}

	async deleteByImportBatch(
		exec: DbExecutor,
		userId: string,
		importBatchId: string,
	) {
		return this.repository.deleteByImportBatch(exec, userId, importBatchId);
	}
}
