import { z } from "zod";

import { cents, hexColor } from "./common";

export const ACCOUNT_TYPES = [
	"bank",
	"mobile_wallet",
	"cash",
	"savings",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const createAccountInput = z.object({
	name: z.string().trim().min(1).max(80),
	type: z.enum(ACCOUNT_TYPES),
	initialBalance: cents.default(0),
	color: hexColor.optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountInput>;

export const updateAccountInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		type: z.enum(ACCOUNT_TYPES),
		initialBalance: cents,
		color: hexColor.nullable(),
		archived: z.boolean(),
		sortOrder: z.number().int(),
	})
	.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountInput>;

/** "The account holds X today": the server moves the initial balance so the computed balance equals X. */
export const reconcileAccountInput = z.object({ balance: cents });
export type ReconcileAccountInput = z.infer<typeof reconcileAccountInput>;

export const listAccountsQuery = z.object({
	includeArchived: z.stringbool().default(false),
});

export type Account = {
	id: string;
	name: string;
	type: AccountType;
	color: string | null;
	initialBalance: number;
	/** initialBalance + every transaction on the account, in centavos. */
	balance: number;
	transactionCount: number;
	archived: boolean;
	sortOrder: number;
	createdAt: string;
};
