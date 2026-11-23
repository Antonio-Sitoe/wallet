import type { Database, DbExecutor } from "@wallet/db";
import { categories, walletCategoryMap } from "@wallet/db/schema/categories";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

import type {
	SetWalletMappingInput,
	UpdateCategoryInput,
} from "./categories.schema";
import type {
	ICategoriesRepository,
	NewCategoryRow,
	NewWalletMappingRow,
} from "./categories.types";

const owned = (userId: string, id: string) =>
	and(eq(categories.userId, userId), eq(categories.id, id));

export class CategoriesRepository implements ICategoriesRepository {
	constructor(private readonly db: Database) {}

	async inTransaction(
		exec: DbExecutor | undefined,
		fn: (tx: DbExecutor) => Promise<void>,
	) {
		if (!exec || exec === this.db) await this.db.transaction(fn);
		else await fn(exec);
	}

	async findById(userId: string, id: string, exec: DbExecutor = this.db) {
		const [row] = await exec.select().from(categories).where(owned(userId, id));
		return row;
	}

	async hasSlug(userId: string, slug: string, exec: DbExecutor = this.db) {
		const [row] = await exec
			.select({ id: categories.id })
			.from(categories)
			.where(and(eq(categories.userId, userId), eq(categories.slug, slug)))
			.limit(1);
		return !!row;
	}

	list(userId: string) {
		return this.db
			.select()
			.from(categories)
			.where(eq(categories.userId, userId))
			.orderBy(asc(categories.sortOrder), asc(categories.name));
	}

	async insert(
		row: NewCategoryRow,
		exec: DbExecutor = this.db,
		options: { ignoreConflict?: boolean } = {},
	) {
		const query = exec.insert(categories).values(row);
		const [created] = await (options.ignoreConflict
			? query.onConflictDoNothing()
			: query
		).returning({ id: categories.id });
		return created?.id;
	}

	async update(userId: string, id: string, input: UpdateCategoryInput) {
		await this.db.update(categories).set(input).where(owned(userId, id));
	}

	async delete(userId: string, id: string) {
		await this.db.delete(categories).where(owned(userId, id));
	}

	async hasChildren(userId: string, id: string) {
		const [child] = await this.db
			.select({ id: categories.id })
			.from(categories)
			.where(and(eq(categories.userId, userId), eq(categories.parentId, id)))
			.limit(1);
		return !!child;
	}

	async childIds(userId: string, parentIds: string[]) {
		const rows = await this.db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.userId, userId),
					inArray(categories.parentId, parentIds),
				),
			);
		return rows.map((r) => r.id);
	}

	parentPairs(userId: string) {
		return this.db
			.select({ id: categories.id, parentId: categories.parentId })
			.from(categories)
			.where(eq(categories.userId, userId));
	}

	slugPairs(userId: string, exec: DbExecutor = this.db) {
		return exec
			.select({ id: categories.id, slug: categories.slug })
			.from(categories)
			.where(and(eq(categories.userId, userId), isNotNull(categories.slug)));
	}

	async findOwnedIds(
		userId: string,
		ids: string[],
		exec: DbExecutor = this.db,
	) {
		const rows = await exec
			.select({ id: categories.id })
			.from(categories)
			.where(and(eq(categories.userId, userId), inArray(categories.id, ids)));
		return rows.map((r) => r.id);
	}

	walletMappings(userId: string, exec: DbExecutor = this.db) {
		return exec
			.select({
				walletName: walletCategoryMap.walletName,
				categoryId: walletCategoryMap.categoryId,
			})
			.from(walletCategoryMap)
			.where(eq(walletCategoryMap.userId, userId))
			.orderBy(asc(walletCategoryMap.walletName));
	}

	async insertWalletMappings(
		rows: NewWalletMappingRow[],
		exec: DbExecutor = this.db,
	) {
		if (rows.length === 0) return;
		await exec.insert(walletCategoryMap).values(rows).onConflictDoNothing();
	}

	async upsertWalletMapping(
		userId: string,
		mapping: SetWalletMappingInput,
		exec: DbExecutor = this.db,
	) {
		await exec
			.insert(walletCategoryMap)
			.values({
				userId,
				walletName: mapping.walletName,
				categoryId: mapping.categoryId,
			})
			.onConflictDoUpdate({
				target: [walletCategoryMap.userId, walletCategoryMap.walletName],
				set: { categoryId: mapping.categoryId },
			});
	}
}
