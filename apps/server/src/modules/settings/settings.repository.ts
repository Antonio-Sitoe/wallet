import type { Database } from "@wallet/db";
import { accounts } from "@wallet/db/schema/accounts";
import { user } from "@wallet/db/schema/auth";
import { categories } from "@wallet/db/schema/categories";
import {
	transactionTemplates,
	userPreferences,
} from "@wallet/db/schema/settings";
import { transactions } from "@wallet/db/schema/transactions";
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type {
	ExportRow,
	NewTemplateRow,
	PreferencesPatch,
	PreferencesRow,
	TemplateRow,
} from "./settings.types";

const ownedTemplate = (userId: string, id: string) =>
	and(eq(transactionTemplates.userId, userId), eq(transactionTemplates.id, id));

export class SettingsRepository {
	constructor(private readonly db: Database) {}

	async preferences(userId: string): Promise<PreferencesRow> {
		const [row] = await this.db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, userId));
		if (row) return row;
		const [created] = await this.db
			.insert(userPreferences)
			.values({ userId })
			.onConflictDoNothing()
			.returning();
		return created ?? (await this.preferences(userId));
	}

	async updatePreferences(userId: string, patch: PreferencesPatch) {
		await this.preferences(userId);
		const [row] = await this.db
			.update(userPreferences)
			.set(patch)
			.where(eq(userPreferences.userId, userId))
			.returning();
		if (!row) throw new Error("Preferências não encontradas");
		return row;
	}

	async profile(userId: string) {
		const [row] = await this.db.select().from(user).where(eq(user.id, userId));
		return row;
	}

	async updateProfile(
		userId: string,
		set: { name?: string; image?: string | null },
	) {
		const [row] = await this.db
			.update(user)
			.set(set)
			.where(eq(user.id, userId))
			.returning();
		return row;
	}

	async deleteUser(userId: string) {
		await this.db.delete(user).where(eq(user.id, userId));
	}

	templates(userId: string) {
		return this.db
			.select()
			.from(transactionTemplates)
			.where(eq(transactionTemplates.userId, userId))
			.orderBy(
				asc(transactionTemplates.position),
				asc(transactionTemplates.createdAt),
			);
	}

	async insertTemplate(row: NewTemplateRow) {
		const [created] = await this.db
			.insert(transactionTemplates)
			.values(row)
			.returning();
		if (!created) throw new Error("Modelo não criado");
		return created;
	}

	async updateTemplate(
		userId: string,
		id: string,
		set: Partial<NewTemplateRow>,
	): Promise<TemplateRow | undefined> {
		const [row] = await this.db
			.update(transactionTemplates)
			.set(set)
			.where(ownedTemplate(userId, id))
			.returning();
		return row;
	}

	async deleteTemplate(userId: string, id: string) {
		const removed = await this.db
			.delete(transactionTemplates)
			.where(ownedTemplate(userId, id))
			.returning({ id: transactionTemplates.id });
		return removed.length > 0;
	}

	async setTemplateOrder(userId: string, ids: string[]) {
		await this.db.transaction(async (tx) => {
			for (const [position, id] of ids.entries()) {
				await tx
					.update(transactionTemplates)
					.set({ position })
					.where(ownedTemplate(userId, id));
			}
		});
	}

	exportRows(userId: string): Promise<ExportRow[]> {
		const parent = alias(categories, "parent");
		return this.db
			.select({
				occurredAt: transactions.occurredAt,
				referenceMonth: transactions.referenceMonth,
				type: transactions.type,
				amount: transactions.amount,
				account: accounts.name,
				category: categories.name,
				parentCategory: parent.name,
				payee: transactions.payee,
				labels: transactions.labels,
				note: transactions.note,
			})
			.from(transactions)
			.innerJoin(accounts, eq(accounts.id, transactions.accountId))
			.leftJoin(categories, eq(categories.id, transactions.categoryId))
			.leftJoin(parent, eq(parent.id, categories.parentId))
			.where(eq(transactions.userId, userId))
			.orderBy(desc(transactions.occurredAt), desc(transactions.id));
	}
}
