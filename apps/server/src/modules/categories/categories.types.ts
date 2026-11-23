import type { DbExecutor } from "@wallet/db";
import type {
	categories,
	walletCategoryMap,
} from "@wallet/db/schema/categories";

import type { SYSTEM_SLUGS } from "./categories.defaults";
import type {
	SetWalletMappingInput,
	UpdateCategoryInput,
	WalletMapping,
} from "./categories.schema";

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
export type NewWalletMappingRow = typeof walletCategoryMap.$inferInsert;
export type SystemSlug = (typeof SYSTEM_SLUGS)[keyof typeof SYSTEM_SLUGS];

export type CategoryActivityPort = {
	countByCategory(userId: string): Promise<Map<string, number>>;
};

export interface ICategoriesRepository {
	inTransaction(
		exec: DbExecutor | undefined,
		fn: (tx: DbExecutor) => Promise<void>,
	): Promise<void>;
	findById(
		userId: string,
		id: string,
		exec?: DbExecutor,
	): Promise<CategoryRow | undefined>;
	hasSlug(userId: string, slug: string, exec?: DbExecutor): Promise<boolean>;
	list(userId: string): Promise<CategoryRow[]>;
	insert(
		row: NewCategoryRow,
		exec?: DbExecutor,
		options?: { ignoreConflict?: boolean },
	): Promise<string | undefined>;
	update(userId: string, id: string, input: UpdateCategoryInput): Promise<void>;
	delete(userId: string, id: string): Promise<void>;
	hasChildren(userId: string, id: string): Promise<boolean>;
	childIds(userId: string, parentIds: string[]): Promise<string[]>;
	parentPairs(
		userId: string,
	): Promise<{ id: string; parentId: string | null }[]>;
	slugPairs(
		userId: string,
		exec?: DbExecutor,
	): Promise<{ id: string; slug: string | null }[]>;
	findOwnedIds(
		userId: string,
		ids: string[],
		exec?: DbExecutor,
	): Promise<string[]>;

	walletMappings(userId: string, exec?: DbExecutor): Promise<WalletMapping[]>;
	insertWalletMappings(
		rows: NewWalletMappingRow[],
		exec?: DbExecutor,
	): Promise<void>;
	upsertWalletMapping(
		userId: string,
		mapping: SetWalletMappingInput,
		exec?: DbExecutor,
	): Promise<void>;
}
