import type { Database, DbExecutor } from "@wallet/db";
import { categories, walletCategoryMap } from "@wallet/db/schema/categories";
import type {
	Category,
	CreateCategoryInput,
	SetWalletMappingInput,
	UpdateCategoryInput,
	WalletMapping,
} from "@wallet/shared";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

import { AppError, conflict, notFound, unprocessable } from "../../lib/errors";
import { isUniqueViolation } from "../../lib/pg";
import { DEFAULT_CATEGORIES, SYSTEM_SLUGS } from "./defaults";

export type CategoryActivityPort = {
	countByCategory(userId: string): Promise<Map<string, number>>;
};

type CategoryRow = typeof categories.$inferSelect;

const duplicateName = () =>
	conflict(
		"CATEGORY_NAME_TAKEN",
		"Já existe uma categoria com esse nome neste nível",
	);

export function createCategoriesService(
	db: Database,
	activity: CategoryActivityPort,
) {
	async function findRow(userId: string, id: string, exec: DbExecutor = db) {
		const [row] = await exec
			.select()
			.from(categories)
			.where(and(eq(categories.userId, userId), eq(categories.id, id)));
		if (!row) throw notFound("Categoria");
		return row;
	}

	async function assertValidParent(
		userId: string,
		parentId: string | null,
		selfId?: string,
	) {
		if (!parentId) return;
		if (parentId === selfId)
			throw unprocessable(
				"INVALID_PARENT",
				"Uma categoria não pode ser mãe de si própria",
			);
		const parent = await findRow(userId, parentId);
		if (parent.parentId) {
			throw unprocessable(
				"INVALID_PARENT",
				"Só há dois níveis: escolha uma categoria principal como mãe",
			);
		}
		if (parent.isSystem)
			throw unprocessable(
				"INVALID_PARENT",
				"Categorias de sistema não têm subcategorias",
			);
	}

	const service = {
		/** Seeds the default tree and Wallet mapping the first time a user needs categories. Safe to call often. */
		async ensureDefaults(userId: string, exec: DbExecutor = db) {
			const [seeded] = await exec
				.select({ id: categories.id })
				.from(categories)
				.where(
					and(
						eq(categories.userId, userId),
						eq(categories.slug, SYSTEM_SLUGS.transfer),
					),
				)
				.limit(1);
			if (seeded) return;

			const run = async (tx: DbExecutor) => {
				const mapping: { walletName: string; slug: string }[] = [];
				let order = 0;
				for (const top of DEFAULT_CATEGORIES) {
					const [parent] = await tx
						.insert(categories)
						.values({
							userId,
							slug: top.slug,
							name: top.name,
							kind: top.kind,
							color: top.color,
							isSystem: top.kind === "system",
							sortOrder: order++,
						})
						.onConflictDoNothing()
						.returning({ id: categories.id });
					if (!parent) continue; // a concurrent request seeded it first
					for (const name of top.wallet ?? [])
						mapping.push({ walletName: name, slug: top.slug });
					for (const [i, child] of (top.children ?? []).entries()) {
						await tx.insert(categories).values({
							userId,
							slug: child.slug,
							name: child.name,
							kind: child.kind,
							color: top.color,
							parentId: parent.id,
							sortOrder: i,
						});
						for (const name of child.wallet ?? [])
							mapping.push({ walletName: name, slug: child.slug });
					}
				}
				const bySlug = await service.idsBySlug(userId, tx);
				if (mapping.length > 0) {
					await tx
						.insert(walletCategoryMap)
						.values(
							mapping.map((m) => ({
								userId,
								walletName: m.walletName,
								categoryId: bySlug.get(m.slug) ?? null,
							})),
						)
						.onConflictDoNothing();
				}
			};
			// Join the caller's transaction when given one; otherwise open our own.
			if (exec === db) await db.transaction(run);
			else await run(exec);
		},

		async idsBySlug(userId: string, exec: DbExecutor = db) {
			const rows = await exec
				.select({ id: categories.id, slug: categories.slug })
				.from(categories)
				.where(and(eq(categories.userId, userId), isNotNull(categories.slug)));
			return new Map(rows.map((r) => [r.slug!, r.id]));
		},

		async list(userId: string): Promise<Category[]> {
			await service.ensureDefaults(userId);
			const [rows, mappings, counts] = await Promise.all([
				db
					.select()
					.from(categories)
					.where(eq(categories.userId, userId))
					.orderBy(asc(categories.sortOrder), asc(categories.name)),
				db
					.select()
					.from(walletCategoryMap)
					.where(eq(walletCategoryMap.userId, userId)),
				activity.countByCategory(userId),
			]);
			const walletNames = new Map<string, string[]>();
			for (const m of mappings) {
				if (!m.categoryId) continue;
				walletNames.set(m.categoryId, [
					...(walletNames.get(m.categoryId) ?? []),
					m.walletName,
				]);
			}
			return rows.map((row: CategoryRow) => ({
				id: row.id,
				name: row.name,
				kind: row.kind,
				parentId: row.parentId,
				color: row.color,
				icon: row.icon,
				isSystem: row.isSystem,
				archived: row.archived,
				walletNames: walletNames.get(row.id) ?? [],
				transactionCount: counts.get(row.id) ?? 0,
			}));
		},

		async create(userId: string, input: CreateCategoryInput) {
			await service.ensureDefaults(userId);
			await assertValidParent(userId, input.parentId);
			try {
				const [row] = await db
					.insert(categories)
					.values({ userId, ...input })
					.returning({ id: categories.id });
				return (await service.list(userId)).find((c) => c.id === row!.id)!;
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicateName();
				throw error;
			}
		},

		async update(userId: string, id: string, input: UpdateCategoryInput) {
			const row = await findRow(userId, id);
			if (row.isSystem)
				throw new AppError(
					403,
					"SYSTEM_CATEGORY",
					"Categorias de sistema não se editam",
				);
			if (input.parentId !== undefined) {
				await assertValidParent(userId, input.parentId, id);
				if (input.parentId) {
					const [child] = await db
						.select({ id: categories.id })
						.from(categories)
						.where(
							and(eq(categories.userId, userId), eq(categories.parentId, id)),
						)
						.limit(1);
					if (child)
						throw unprocessable(
							"INVALID_PARENT",
							"Esta categoria tem subcategorias; não pode passar a subcategoria",
						);
				}
			}
			try {
				await db
					.update(categories)
					.set(input)
					.where(and(eq(categories.userId, userId), eq(categories.id, id)));
			} catch (error) {
				if (isUniqueViolation(error)) throw duplicateName();
				throw error;
			}
			return (await service.list(userId)).find((c) => c.id === id)!;
		},

		async remove(userId: string, id: string) {
			const row = await findRow(userId, id);
			if (row.isSystem)
				throw new AppError(
					403,
					"SYSTEM_CATEGORY",
					"Categorias de sistema não se apagam",
				);
			const [child] = await db
				.select({ id: categories.id })
				.from(categories)
				.where(and(eq(categories.userId, userId), eq(categories.parentId, id)))
				.limit(1);
			if (child)
				throw conflict(
					"CATEGORY_HAS_CHILDREN",
					"Apague ou mova as subcategorias primeiro",
				);
			const count = (await activity.countByCategory(userId)).get(id) ?? 0;
			if (count > 0) {
				throw conflict(
					"CATEGORY_IN_USE",
					`A categoria tem ${count} transacções. Arquive-a em vez de a apagar.`,
				);
			}
			await db
				.delete(categories)
				.where(and(eq(categories.userId, userId), eq(categories.id, id)));
		},

		async getWalletMap(
			userId: string,
			exec: DbExecutor = db,
		): Promise<WalletMapping[]> {
			await service.ensureDefaults(userId, exec);
			return exec
				.select({
					walletName: walletCategoryMap.walletName,
					categoryId: walletCategoryMap.categoryId,
				})
				.from(walletCategoryMap)
				.where(eq(walletCategoryMap.userId, userId))
				.orderBy(asc(walletCategoryMap.walletName));
		},

		async setWalletMappings(
			userId: string,
			mappings: SetWalletMappingInput[],
			exec: DbExecutor = db,
		) {
			if (mappings.length === 0) return;
			const ids = mappings
				.map((m) => m.categoryId)
				.filter((v): v is string => v !== null);
			await service.assertOwned(userId, ids, exec);
			for (const m of mappings) {
				await exec
					.insert(walletCategoryMap)
					.values({
						userId,
						walletName: m.walletName,
						categoryId: m.categoryId,
					})
					.onConflictDoUpdate({
						target: [walletCategoryMap.userId, walletCategoryMap.walletName],
						set: { categoryId: m.categoryId },
					});
			}
		},

		// ---- Used by other modules ----

		async assertOwned(userId: string, ids: string[], exec: DbExecutor = db) {
			const unique = [...new Set(ids)];
			if (unique.length === 0) return;
			const found = await exec
				.select({ id: categories.id })
				.from(categories)
				.where(
					and(eq(categories.userId, userId), inArray(categories.id, unique)),
				);
			if (found.length !== unique.length)
				throw unprocessable("UNKNOWN_CATEGORY", "Categoria inexistente");
		},

		/** The given ids plus their subcategories (the tree has two levels). */
		/** category id → parent id (null for a top-level category). */
		async parentMap(userId: string) {
			const rows = await db
				.select({ id: categories.id, parentId: categories.parentId })
				.from(categories)
				.where(eq(categories.userId, userId));
			return new Map(rows.map((r) => [r.id, r.parentId]));
		},

		async withDescendants(userId: string, ids: string[]) {
			if (ids.length === 0) return [];
			const children = await db
				.select({ id: categories.id })
				.from(categories)
				.where(
					and(eq(categories.userId, userId), inArray(categories.parentId, ids)),
				);
			return [...new Set([...ids, ...children.map((c) => c.id)])];
		},

		/** Id of a seeded category the app relies on (Transferência, Estique / Xitique). */
		async systemCategoryId(
			userId: string,
			slug: (typeof SYSTEM_SLUGS)[keyof typeof SYSTEM_SLUGS],
			exec: DbExecutor = db,
		) {
			await service.ensureDefaults(userId, exec);
			const id = (await service.idsBySlug(userId, exec)).get(slug);
			if (!id)
				throw new AppError(
					500,
					"MISSING_SYSTEM_CATEGORY",
					`Categoria de sistema em falta: ${slug}`,
				);
			return id;
		},
	};
	return service;
}

export type CategoriesService = ReturnType<typeof createCategoriesService>;
