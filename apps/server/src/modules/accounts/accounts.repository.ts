import type { Database, DbExecutor } from "@wallet/db";
import { accounts } from "@wallet/db/schema/accounts";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { AccountType, UpdateAccountInput } from "./accounts.schema";
import type {
	AccountRow,
	IAccountsRepository,
	NewAccountRow,
} from "./accounts.types";

const owned = (userId: string, id: string) =>
	and(eq(accounts.userId, userId), eq(accounts.id, id));

export class AccountsRepository implements IAccountsRepository {
	constructor(private readonly db: Database) {}

	async findById(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(accounts)
			.where(owned(userId, id));
		return row;
	}

	list(userId: string, options: { includeArchived: boolean }) {
		return this.db
			.select()
			.from(accounts)
			.where(
				and(
					eq(accounts.userId, userId),
					options.includeArchived ? undefined : eq(accounts.archived, false),
				),
			)
			.orderBy(asc(accounts.sortOrder), asc(accounts.name));
	}

	async insert(row: NewAccountRow): Promise<AccountRow> {
		const [created] = await this.db.insert(accounts).values(row).returning();
		return created!;
	}

	async update(userId: string, id: string, input: UpdateAccountInput) {
		await this.db.update(accounts).set(input).where(owned(userId, id));
	}

	async setInitialBalance(userId: string, id: string, initialBalance: number) {
		await this.db
			.update(accounts)
			.set({ initialBalance })
			.where(owned(userId, id));
	}

	async clearInitialBalances(userId: string) {
		await this.db
			.update(accounts)
			.set({ initialBalance: 0 })
			.where(eq(accounts.userId, userId));
	}

	async delete(userId: string, id: string) {
		await this.db.delete(accounts).where(owned(userId, id));
	}

	async findOwnedIds(
		userId: string,
		ids: string[],
		exec: DbExecutor = this.db,
	) {
		const rows = await exec
			.select({ id: accounts.id })
			.from(accounts)
			.where(and(eq(accounts.userId, userId), inArray(accounts.id, ids)));
		return rows.map((r) => r.id);
	}

	findByLowerNames(
		userId: string,
		lowered: string[],
		exec: DbExecutor = this.db,
	) {
		return exec
			.select({ id: accounts.id, name: accounts.name })
			.from(accounts)
			.where(
				and(
					eq(accounts.userId, userId),
					inArray(sql`lower(${accounts.name})`, lowered),
				),
			);
	}

	insertMany(
		userId: string,
		rows: { name: string; type: AccountType }[],
		exec: DbExecutor = this.db,
	) {
		return exec
			.insert(accounts)
			.values(rows.map((r) => ({ userId, name: r.name, type: r.type })))
			.returning({ id: accounts.id, name: accounts.name });
	}
}
