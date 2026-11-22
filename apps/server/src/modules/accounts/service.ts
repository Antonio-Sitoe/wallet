import type { Database, DbExecutor } from "@wallet/db";
import { accounts } from "@wallet/db/schema/accounts";
import type {
	Account,
	AccountType,
	CreateAccountInput,
	UpdateAccountInput,
} from "@wallet/shared";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { conflict, notFound, unprocessable } from "../../lib/errors";
import { isUniqueViolation } from "../../lib/pg";

/** What this module needs from transactions, without importing that module. */
export type AccountActivityPort = {
	statsByAccount(
		userId: string,
		accountIds?: string[],
	): Promise<Map<string, { sum: number; count: number }>>;
};

type AccountRow = typeof accounts.$inferSelect;

function toAccount(
	row: AccountRow,
	stats?: { sum: number; count: number },
): Account {
	return {
		id: row.id,
		name: row.name,
		type: row.type,
		color: row.color,
		initialBalance: row.initialBalance,
		balance: row.initialBalance + (stats?.sum ?? 0),
		transactionCount: stats?.count ?? 0,
		archived: row.archived,
		sortOrder: row.sortOrder,
		createdAt: row.createdAt.toISOString(),
	};
}

const duplicateName = (name: string) =>
	conflict("ACCOUNT_NAME_TAKEN", `Já existe uma conta chamada "${name}"`);

export function createAccountsService(
	db: Database,
	activity: AccountActivityPort,
) {
	async function findRow(userId: string, id: string) {
		const [row] = await db
			.select()
			.from(accounts)
			.where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
		if (!row) throw notFound("Conta");
		return row;
	}

	async function withStats(userId: string, rows: AccountRow[]) {
		const stats = await activity.statsByAccount(
			userId,
			rows.map((r) => r.id),
		);
		return rows.map((row) => toAccount(row, stats.get(row.id)));
	}

	const service = {
		async list(userId: string, options: { includeArchived: boolean }) {
			const rows = await db
				.select()
				.from(accounts)
				.where(
					and(
						eq(accounts.userId, userId),
						options.includeArchived ? undefined : eq(accounts.archived, false),
					),
				)
				.orderBy(asc(accounts.sortOrder), asc(accounts.name));
			return withStats(userId, rows);
		},

		async get(userId: string, id: string) {
			const [account] = await withStats(userId, [await findRow(userId, id)]);
			return account!;
		},

		async create(userId: string, input: CreateAccountInput) {
			try {
				const [row] = await db
					.insert(accounts)
					.values({ userId, ...input })
					.returning();
				return toAccount(row!);
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicateName(input.name);
				throw error;
			}
		},

		async update(userId: string, id: string, input: UpdateAccountInput) {
			await findRow(userId, id);
			try {
				await db
					.update(accounts)
					.set(input)
					.where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicateName(input.name ?? "");
				throw error;
			}
			return service.get(userId, id);
		},

		/** Sets the initial balance so that today's computed balance equals `balance`. */
		async reconcile(userId: string, id: string, balance: number) {
			const row = await findRow(userId, id);
			const stats = (await activity.statsByAccount(userId, [id])).get(id);
			const initialBalance = balance - (stats?.sum ?? 0);
			await db
				.update(accounts)
				.set({ initialBalance })
				.where(and(eq(accounts.userId, userId), eq(accounts.id, row.id)));
			return service.get(userId, id);
		},

		async remove(userId: string, id: string) {
			await findRow(userId, id);
			const stats = (await activity.statsByAccount(userId, [id])).get(id);
			if (stats && stats.count > 0) {
				throw conflict(
					"ACCOUNT_HAS_TRANSACTIONS",
					`A conta tem ${stats.count} transacções. Arquive-a em vez de a apagar.`,
				);
			}
			await db
				.delete(accounts)
				.where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
		},

		// ---- Used by other modules ----

		/** Throws 422 unless every id is an account of this user. */
		async assertOwned(userId: string, ids: string[], exec: DbExecutor = db) {
			const unique = [...new Set(ids)];
			if (unique.length === 0) return;
			const found = await exec
				.select({ id: accounts.id })
				.from(accounts)
				.where(and(eq(accounts.userId, userId), inArray(accounts.id, unique)));
			if (found.length !== unique.length) {
				throw unprocessable("UNKNOWN_ACCOUNT", "Conta inexistente");
			}
		},

		/** Looks accounts up by name (case-insensitive) and returns lower(name) → id. */
		async findByNames(userId: string, names: string[], exec: DbExecutor = db) {
			const lowered = [...new Set(names.map((n) => n.toLowerCase()))];
			const result = new Map<string, string>();
			if (lowered.length === 0) return result;
			const rows = await exec
				.select({ id: accounts.id, name: accounts.name })
				.from(accounts)
				.where(
					and(
						eq(accounts.userId, userId),
						inArray(sql`lower(${accounts.name})`, lowered),
					),
				);
			for (const row of rows) result.set(row.name.toLowerCase(), row.id);
			return result;
		},

		/** Creates the accounts that do not exist yet (balance 0) and returns lower(name) → id for all of them. */
		async ensureByNames(
			userId: string,
			wanted: { name: string; type: AccountType }[],
			exec: DbExecutor = db,
		) {
			const existing = await service.findByNames(
				userId,
				wanted.map((w) => w.name),
				exec,
			);
			const missing = wanted.filter((w, i, all) => {
				const key = w.name.toLowerCase();
				return (
					!existing.has(key) &&
					all.findIndex((o) => o.name.toLowerCase() === key) === i
				);
			});
			if (missing.length > 0) {
				const created = await exec
					.insert(accounts)
					.values(missing.map((m) => ({ userId, name: m.name, type: m.type })))
					.returning({ id: accounts.id, name: accounts.name });
				for (const row of created) existing.set(row.name.toLowerCase(), row.id);
			}
			return existing;
		},
	};
	return service;
}

export type AccountsService = ReturnType<typeof createAccountsService>;
