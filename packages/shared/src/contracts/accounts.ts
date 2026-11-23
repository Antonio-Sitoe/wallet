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

/** "The account holds X": the server adds an "Acerto" transaction for the difference (none when it already matches). */
export const reconcileAccountInput = z.object({
	balance: cents,
	/** When the account held that balance; defaults to now. */
	at: z.coerce.date().optional(),
});
export type ReconcileAccountInput = z.infer<typeof reconcileAccountInput>;

/** Every active account to 0 at `at`, keeping the history (one "Acerto" per account that is not at 0). */
export const zeroBalancesInput = z.object({ at: z.coerce.date().optional() });
export type ZeroBalancesInput = z.infer<typeof zeroBalancesInput>;

/** Deletes every transaction, transfer and import and sets initial balances to 0. Accounts, categories and the plan stay. */
export const resetDataInput = z.object({ confirm: z.literal("APAGAR") });
export type ResetDataInput = z.infer<typeof resetDataInput>;

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
