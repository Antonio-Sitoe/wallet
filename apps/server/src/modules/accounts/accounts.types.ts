import type { DbExecutor } from "@wallet/db";
import type { accounts } from "@wallet/db/schema/accounts";

import type { AccountType, UpdateAccountInput } from "./accounts.schema";

export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;

export type AccountStats = { sum: number; count: number };

export type AccountActivityPort = {
	statsByAccount(
		userId: string,
		accountIds?: string[],
	): Promise<Map<string, AccountStats>>;
	createAdjustment(
		userId: string,
		input: {
			accountId: string;
			amount: number;
			occurredAt: Date;
			note?: string;
		},
	): Promise<string | null>;
	wipe(userId: string): Promise<number>;
};

export interface IAccountsRepository {
	findById(userId: string, id: string): Promise<AccountRow | undefined>;
	list(
		userId: string,
		options: { includeArchived: boolean },
	): Promise<AccountRow[]>;
	insert(row: NewAccountRow): Promise<AccountRow>;
	update(userId: string, id: string, input: UpdateAccountInput): Promise<void>;
	setInitialBalance(
		userId: string,
		id: string,
		initialBalance: number,
	): Promise<void>;
	clearInitialBalances(userId: string): Promise<void>;
	delete(userId: string, id: string): Promise<void>;
	findOwnedIds(
		userId: string,
		ids: string[],
		exec?: DbExecutor,
	): Promise<string[]>;
	findByLowerNames(
		userId: string,
		lowered: string[],
		exec?: DbExecutor,
	): Promise<{ id: string; name: string }[]>;
	insertMany(
		userId: string,
		rows: { name: string; type: AccountType }[],
		exec?: DbExecutor,
	): Promise<{ id: string; name: string }[]>;
}
