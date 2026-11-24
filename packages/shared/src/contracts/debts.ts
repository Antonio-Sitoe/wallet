import { z } from "zod";

import { id, positiveCents } from "./common";

export const DEBT_DIRECTIONS = ["owed_to_me", "i_owe"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

const person = z.string().trim().min(1).max(120);
const note = z.string().trim().max(500).nullable();
const isoDay = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
	.nullable();

export const createDebtInput = z.object({
	person,
	direction: z.enum(DEBT_DIRECTIONS),
	amount: positiveCents,
	note: note.optional(),
	remindOn: isoDay.optional(),
});
export type CreateDebtInput = z.infer<typeof createDebtInput>;

export const updateDebtInput = z
	.object({
		person,
		amount: positiveCents,
		note,
		remindOn: isoDay,
		archived: z.boolean(),
	})
	.partial();
export type UpdateDebtInput = z.infer<typeof updateDebtInput>;

export const payDebtInput = z.object({
	amount: positiveCents,
	accountId: id,
	occurredAt: z.coerce.date().optional(),
	note: note.optional(),
});
export type PayDebtInput = z.infer<typeof payDebtInput>;

export const listDebtsQuery = z.object({
	includeArchived: z.stringbool().default(false),
});

export const debtPaymentParams = z.object({ id, transactionId: id });

export const debtSuggestionParams = z.object({
	key: z.string().trim().min(1).max(120),
});

export type DebtPayment = {
	transactionId: string;
	occurredAt: string;
	accountId: string;
	amount: number;
	note: string | null;
};

export type Debt = {
	id: string;
	person: string;
	direction: DebtDirection;
	amount: number;
	paid: number;
	note: string | null;
	remindOn: string | null;
	archived: boolean;
	imported: boolean;
	createdAt: string;
	payments: DebtPayment[];
};

export type DebtSuggestion = {
	key: string;
	person: string;
	outCount: number;
	outTotal: number;
	inCount: number;
	inTotal: number;
	direction: DebtDirection;
	net: number;
};
