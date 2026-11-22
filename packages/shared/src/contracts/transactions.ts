import { z } from "zod";

import { id, manyIds, positiveCents, yearMonth } from "./common";

export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const text = (max: number) => z.string().trim().max(max);

export const createTransactionInput = z.object({
	type: z.enum(["expense", "income"]),
	accountId: id,
	categoryId: id.nullable().default(null),
	/** Always positive; the type gives the sign. */
	amount: positiveCents,
	occurredAt: z.coerce.date(),
	/** Defaults to the month of occurredAt. */
	referenceMonth: yearMonth.optional(),
	note: text(500).nullable().optional(),
	payee: text(120).nullable().optional(),
	/** Pays this item of a month's list. */
	monthItemId: id.nullable().optional(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionInput>;

export const updateTransactionInput = createTransactionInput
	.omit({ categoryId: true })
	.extend({ categoryId: id.nullable() })
	.partial();
export type UpdateTransactionInput = z.infer<typeof updateTransactionInput>;

export const createTransferInput = z
	.object({
		fromAccountId: id,
		toAccountId: id,
		amount: positiveCents,
		occurredAt: z.coerce.date(),
		referenceMonth: yearMonth.optional(),
		note: text(500).nullable().optional(),
		/** Pays this item of a month's list (set on the outgoing leg). */
		monthItemId: id.nullable().optional(),
	})
	.refine((v) => v.fromAccountId !== v.toAccountId, {
		message: "A conta de origem e a de destino têm de ser diferentes",
		path: ["toAccountId"],
	});
export type CreateTransferInput = z.infer<typeof createTransferInput>;

export const updateTransferInput = z
	.object({
		fromAccountId: id,
		toAccountId: id,
		amount: positiveCents,
		occurredAt: z.coerce.date(),
		referenceMonth: yearMonth,
		note: text(500).nullable(),
		monthItemId: id.nullable(),
	})
	.partial();
export type UpdateTransferInput = z.infer<typeof updateTransferInput>;

export const listTransactionsQuery = z.object({
	from: z.coerce.date().optional(),
	/** Exclusive. */
	to: z.coerce.date().optional(),
	accountId: manyIds,
	/** A parent category also matches its subcategories. */
	categoryId: manyIds,
	type: z.enum(TRANSACTION_TYPES).optional(),
	referenceMonth: yearMonth.optional(),
	payee: z.string().trim().min(1).max(120).optional(),
	/** Searches note and payee. */
	q: z.string().trim().min(1).max(120).optional(),
	cursor: z.string().max(200).optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuery>;

export type Transaction = {
	id: string;
	type: TransactionType;
	accountId: string;
	categoryId: string | null;
	/** Signed centavos: negative leaves the account, positive enters it. */
	amount: number;
	occurredAt: string;
	referenceMonth: string;
	note: string | null;
	payee: string | null;
	transferId: string | null;
	/** For a transfer leg: the account on the other side. */
	counterpartAccountId: string | null;
	importBatchId: string | null;
	monthItemId: string | null;
	createdAt: string;
};

export type TransactionPage = {
	items: Transaction[];
	nextCursor: string | null;
};

export type Transfer = {
	id: string;
	fromAccountId: string;
	toAccountId: string;
	amount: number;
	occurredAt: string;
	referenceMonth: string;
	note: string | null;
	monthItemId: string | null;
	legs: { outId: string; inId: string };
};
