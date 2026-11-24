import type { DbExecutor } from "@wallet/db";

import {
	isForeignKeyViolation,
	isUniqueViolation,
} from "../../shared/database/pg-errors";
import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import type {
	Account,
	AccountType,
	CreateAccountInput,
	UpdateAccountInput,
} from "./accounts.schema";
import type {
	AccountActivityPort,
	AccountRow,
	AccountStats,
	IAccountsRepository,
} from "./accounts.types";

function toAccount(row: AccountRow, stats?: AccountStats): Account {
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

export class AccountsService {
	constructor(
		private readonly repository: IAccountsRepository,
		private readonly activity: AccountActivityPort,
	) {}

	private async findRow(userId: string, id: string) {
		const row = await this.repository.findById(userId, id);
		if (!row) throw notFound("Conta");
		return row;
	}

	private async statsOf(userId: string, id: string) {
		return (await this.activity.statsByAccount(userId, [id])).get(id);
	}

	private async withStats(userId: string, rows: AccountRow[]) {
		const stats = await this.activity.statsByAccount(
			userId,
			rows.map((r) => r.id),
		);
		return rows.map((row) => toAccount(row, stats.get(row.id)));
	}

	async list(userId: string, options: { includeArchived: boolean }) {
		return this.withStats(userId, await this.repository.list(userId, options));
	}

	async get(userId: string, id: string) {
		const [account] = await this.withStats(userId, [
			await this.findRow(userId, id),
		]);
		return account!;
	}

	async create(userId: string, input: CreateAccountInput) {
		try {
			return toAccount(await this.repository.insert({ userId, ...input }));
		} catch (error) {
			if (isUniqueViolation(error)) throw duplicateName(input.name);
			throw error;
		}
	}

	async update(userId: string, id: string, input: UpdateAccountInput) {
		await this.findRow(userId, id);
		try {
			await this.repository.update(userId, id, input);
		} catch (error) {
			if (isUniqueViolation(error)) throw duplicateName(input.name ?? "");
			throw error;
		}
		return this.get(userId, id);
	}

	async reconcile(
		userId: string,
		id: string,
		balance: number,
		at = new Date(),
	) {
		const account = await this.get(userId, id);
		await this.activity.createAdjustment(userId, {
			accountId: id,
			amount: balance - account.balance,
			occurredAt: at,
		});
		return this.get(userId, id);
	}

	async zeroBalances(userId: string, at = new Date()) {
		const active = await this.list(userId, { includeArchived: false });
		for (const account of active) {
			await this.activity.createAdjustment(userId, {
				accountId: account.id,
				amount: -account.balance,
				occurredAt: at,
				note: "Começar do zero",
			});
		}
		return this.list(userId, { includeArchived: false });
	}

	async resetData(userId: string) {
		const transactions = await this.activity.wipe(userId);
		await this.repository.clearInitialBalances(userId);
		return { removed: { transactions } };
	}

	async remove(userId: string, id: string) {
		await this.findRow(userId, id);
		const stats = await this.statsOf(userId, id);
		if (stats && stats.count > 0) {
			throw conflict(
				"ACCOUNT_HAS_TRANSACTIONS",
				`A conta tem ${stats.count} transacções. Arquive-a em vez de a apagar.`,
			);
		}
		try {
			await this.repository.delete(userId, id);
		} catch (error) {
			if (isForeignKeyViolation(error))
				throw conflict(
					"ACCOUNT_IN_USE",
					"A conta está ligada a uma meta. Mude a meta para outra conta ou apague-a primeiro.",
				);
			throw error;
		}
	}

	async assertOwned(userId: string, ids: string[], exec?: DbExecutor) {
		const unique = [...new Set(ids)];
		if (unique.length === 0) return;
		const found = await this.repository.findOwnedIds(userId, unique, exec);
		if (found.length !== unique.length) {
			throw unprocessable("UNKNOWN_ACCOUNT", "Conta inexistente");
		}
	}

	async findByNames(userId: string, names: string[], exec?: DbExecutor) {
		const lowered = [...new Set(names.map((n) => n.toLowerCase()))];
		const result = new Map<string, string>();
		if (lowered.length === 0) return result;
		const rows = await this.repository.findByLowerNames(userId, lowered, exec);
		for (const row of rows) result.set(row.name.toLowerCase(), row.id);
		return result;
	}

	async ensureByNames(
		userId: string,
		wanted: { name: string; type: AccountType }[],
		exec?: DbExecutor,
	) {
		const existing = await this.findByNames(
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
			const created = await this.repository.insertMany(userId, missing, exec);
			for (const row of created) existing.set(row.name.toLowerCase(), row.id);
		}
		return existing;
	}
}
