import type { DbExecutor } from "@wallet/db";

import { isUniqueViolation } from "../../shared/database/pg-errors";
import {
	AppError,
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import { DEFAULT_CATEGORIES, SYSTEM_SLUGS } from "./categories.defaults";
import type {
	Category,
	CreateCategoryInput,
	SetWalletMappingInput,
	UpdateCategoryInput,
	WalletMapping,
} from "./categories.schema";
import type {
	CategoryActivityPort,
	ICategoriesRepository,
	SystemSlug,
} from "./categories.types";

const duplicateName = () =>
	conflict(
		"CATEGORY_NAME_TAKEN",
		"Já existe uma categoria com esse nome neste nível",
	);

const systemCategory = (action: string) =>
	new AppError(
		403,
		"SYSTEM_CATEGORY",
		`Categorias de sistema não se ${action}`,
	);

export class CategoriesService {
	constructor(
		private readonly repository: ICategoriesRepository,
		private readonly activity: CategoryActivityPort,
	) {}

	private async findRow(userId: string, id: string, exec?: DbExecutor) {
		const row = await this.repository.findById(userId, id, exec);
		if (!row) throw notFound("Categoria");
		return row;
	}

	private async assertValidParent(
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
		const parent = await this.findRow(userId, parentId);
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

	ensureDefaults = async (userId: string, exec?: DbExecutor) => {
		if (await this.repository.hasSlug(userId, SYSTEM_SLUGS.transfer, exec))
			return;

		await this.repository.inTransaction(exec, async (tx) => {
			const mapping: { walletName: string; slug: string }[] = [];
			let order = 0;
			for (const top of DEFAULT_CATEGORIES) {
				const parentId = await this.repository.insert(
					{
						userId,
						slug: top.slug,
						name: top.name,
						kind: top.kind,
						color: top.color,
						isSystem: top.kind === "system",
						sortOrder: order++,
					},
					tx,
					{ ignoreConflict: true },
				);
				if (!parentId) continue;
				for (const name of top.wallet ?? [])
					mapping.push({ walletName: name, slug: top.slug });
				for (const [i, child] of (top.children ?? []).entries()) {
					await this.repository.insert(
						{
							userId,
							slug: child.slug,
							name: child.name,
							kind: child.kind,
							color: top.color,
							parentId,
							sortOrder: i,
						},
						tx,
					);
					for (const name of child.wallet ?? [])
						mapping.push({ walletName: name, slug: child.slug });
				}
			}
			const bySlug = await this.idsBySlug(userId, tx);
			await this.repository.insertWalletMappings(
				mapping.map((m) => ({
					userId,
					walletName: m.walletName,
					categoryId: bySlug.get(m.slug) ?? null,
				})),
				tx,
			);
		});
	};

	idsBySlug = async (userId: string, exec?: DbExecutor) => {
		const rows = await this.repository.slugPairs(userId, exec);
		return new Map(rows.map((r) => [r.slug!, r.id]));
	};

	list = async (userId: string): Promise<Category[]> => {
		await this.ensureDefaults(userId);
		const [rows, mappings, counts] = await Promise.all([
			this.repository.list(userId),
			this.repository.walletMappings(userId),
			this.activity.countByCategory(userId),
		]);
		const walletNames = new Map<string, string[]>();
		for (const m of mappings) {
			if (!m.categoryId) continue;
			walletNames.set(m.categoryId, [
				...(walletNames.get(m.categoryId) ?? []),
				m.walletName,
			]);
		}
		return rows.map((row) => ({
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
	};

	async create(userId: string, input: CreateCategoryInput) {
		await this.ensureDefaults(userId);
		await this.assertValidParent(userId, input.parentId);
		try {
			const id = await this.repository.insert({ userId, ...input });
			return (await this.list(userId)).find((c) => c.id === id)!;
		} catch (error) {
			if (isUniqueViolation(error)) throw duplicateName();
			throw error;
		}
	}

	async update(userId: string, id: string, input: UpdateCategoryInput) {
		const row = await this.findRow(userId, id);
		if (row.isSystem) throw systemCategory("editam");
		if (input.parentId !== undefined) {
			await this.assertValidParent(userId, input.parentId, id);
			if (input.parentId && (await this.repository.hasChildren(userId, id)))
				throw unprocessable(
					"INVALID_PARENT",
					"Esta categoria tem subcategorias; não pode passar a subcategoria",
				);
		}
		try {
			await this.repository.update(userId, id, input);
		} catch (error) {
			if (isUniqueViolation(error)) throw duplicateName();
			throw error;
		}
		return (await this.list(userId)).find((c) => c.id === id)!;
	}

	async remove(userId: string, id: string) {
		const row = await this.findRow(userId, id);
		if (row.isSystem) throw systemCategory("apagam");
		if (await this.repository.hasChildren(userId, id))
			throw conflict(
				"CATEGORY_HAS_CHILDREN",
				"Apague ou mova as subcategorias primeiro",
			);
		const count = (await this.activity.countByCategory(userId)).get(id) ?? 0;
		if (count > 0) {
			throw conflict(
				"CATEGORY_IN_USE",
				`A categoria tem ${count} transacções. Arquive-a em vez de a apagar.`,
			);
		}
		await this.repository.delete(userId, id);
	}

	getWalletMap = async (
		userId: string,
		exec?: DbExecutor,
	): Promise<WalletMapping[]> => {
		await this.ensureDefaults(userId, exec);
		return this.repository.walletMappings(userId, exec);
	};

	setWalletMappings = async (
		userId: string,
		mappings: SetWalletMappingInput[],
		exec?: DbExecutor,
	) => {
		if (mappings.length === 0) return;
		const ids = mappings
			.map((m) => m.categoryId)
			.filter((v): v is string => v !== null);
		await this.assertOwned(userId, ids, exec);
		for (const m of mappings)
			await this.repository.upsertWalletMapping(userId, m, exec);
	};

	assertOwned = async (userId: string, ids: string[], exec?: DbExecutor) => {
		const unique = [...new Set(ids)];
		if (unique.length === 0) return;
		const found = await this.repository.findOwnedIds(userId, unique, exec);
		if (found.length !== unique.length)
			throw unprocessable("UNKNOWN_CATEGORY", "Categoria inexistente");
	};

	parentMap = async (userId: string) => {
		const rows = await this.repository.parentPairs(userId);
		return new Map(rows.map((r) => [r.id, r.parentId]));
	};

	withDescendants = async (userId: string, ids: string[]) => {
		if (ids.length === 0) return [];
		const children = await this.repository.childIds(userId, ids);
		return [...new Set([...ids, ...children])];
	};

	systemCategoryId = async (
		userId: string,
		slug: SystemSlug,
		exec?: DbExecutor,
	) => {
		await this.ensureDefaults(userId, exec);
		const id = (await this.idsBySlug(userId, exec)).get(slug);
		if (!id)
			throw new AppError(
				500,
				"MISSING_SYSTEM_CATEGORY",
				`Categoria de sistema em falta: ${slug}`,
			);
		return id;
	};
}
