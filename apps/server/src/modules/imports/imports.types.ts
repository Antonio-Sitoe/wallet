import type { DbExecutor } from "@wallet/db";
import type { importBatches } from "@wallet/db/schema/imports";

import type {
	AccountType,
	MonthItem,
	SheetPlanItem,
	SheetPreview,
} from "./imports.schema";
import type { WalletPlanSummary } from "./imports.wallet-csv";

export type BatchRow = typeof importBatches.$inferSelect;
export type NewBatchRow = typeof importBatches.$inferInsert;

export type ImportedTransaction = {
	accountId: string;
	categoryId: string | null;
	type: "expense" | "income";
	amount: number;
	occurredAt: Date;
	referenceMonth: string;
	note: string | null;
	payee: string | null;
	labels: string[];
	paymentType: string | null;
	currency: string;
	refAmount: number | null;
	importHash: string;
};

export type ImportedTransfer = {
	fromAccountId: string;
	toAccountId: string;
	categoryId: string | null;
	amount: number;
	occurredAt: Date;
	referenceMonth: string;
	note: string | null;
	outHash: string;
	inHash: string;
};

export type ImportsDeps = {
	accounts: {
		findByNames(
			userId: string,
			names: string[],
			exec?: DbExecutor,
		): Promise<Map<string, string>>;
		ensureByNames(
			userId: string,
			wanted: { name: string; type: AccountType }[],
			exec?: DbExecutor,
		): Promise<Map<string, string>>;
		assertOwned(
			userId: string,
			ids: string[],
			exec?: DbExecutor,
		): Promise<void>;
	};
	categories: {
		getWalletMap(
			userId: string,
			exec?: DbExecutor,
		): Promise<{ walletName: string; categoryId: string | null }[]>;
		setWalletMappings(
			userId: string,
			mappings: { walletName: string; categoryId: string | null }[],
			exec?: DbExecutor,
		): Promise<void>;
		transferCategoryId(userId: string, exec?: DbExecutor): Promise<string>;
		savingsCategoryId(userId: string, exec?: DbExecutor): Promise<string>;
	};
	transactions: {
		existingImportHashes(
			userId: string,
			hashes: string[],
			exec?: DbExecutor,
		): Promise<Set<string>>;
		insertImported(
			exec: DbExecutor,
			userId: string,
			batchId: string,
			data: {
				transactions: ImportedTransaction[];
				transfers: ImportedTransfer[];
			},
		): Promise<{ transactions: number; transfers: number }>;
		deleteByImportBatch(
			exec: DbExecutor,
			userId: string,
			batchId: string,
		): Promise<{ transactions: number; transfers: number }>;
	};
};

type SheetGroup = SheetPlanItem["group"];

export type SheetImportDeps = {
	accounts: {
		findByNames(userId: string, names: string[]): Promise<Map<string, string>>;
		list(
			userId: string,
			options: { includeArchived: boolean },
		): Promise<{ id: string; type: string; archived: boolean }[]>;
	};
	goals: {
		importGoal(
			userId: string,
			input: {
				name: string;
				target: number;
				startingAmount: number;
				accountId: string;
				importBatchId: string;
				parts: { name: string; amount: number; paid: boolean }[];
			},
		): Promise<string>;
		removeMany(userId: string, ids: string[]): Promise<void>;
	};
	categories: {
		idsBySlug(userId: string): Promise<Map<string, string>>;
		ensureDefaults(userId: string): Promise<void>;
	};
	budgets: {
		previewMatches(
			userId: string,
			items: {
				id: string;
				month: string;
				categoryId: string | null;
				capacity?: number;
			}[],
		): Promise<Map<string, number>>;
		applySheet(
			userId: string,
			input: {
				year: number;
				expectedIncome?: number;
				planItems: (Omit<SheetPlanItem, "months"> & { months: number[] })[];
				months: {
					month: string;
					items: {
						key: string;
						planKey: string | null;
						name: string;
						amount: number;
						categoryId: string | null;
						group: SheetGroup;
					}[];
				}[];
			},
		): Promise<{
			created: SheetCreated;
			monthItemByKey: Map<string, string>;
		}>;
		undoSheet(userId: string, created: SheetCreated): Promise<unknown>;
		getMonthItem(userId: string, id: string): Promise<MonthItem>;
		pay(
			userId: string,
			id: string,
			input: {
				amount?: number;
				accountId?: string;
				occurredAt?: Date;
				note?: string | null;
			},
		): Promise<MonthItem>;
	};
	transactions: { remove(userId: string, id: string): Promise<void> };
};

export type StoredWalletSummary = WalletPlanSummary & {
	result?: {
		transactions: number;
		transfers: number;
		skippedDuplicates: number;
		ignored: number;
		ignoredHashes?: string[];
	};
};

export type SheetCreated = {
	planId: string | null;
	planItemIds: string[];
	monthItemIds: string[];
};

export type StoredSheetSummary = Omit<
	SheetPreview,
	"id" | "status" | "createdAt" | "committedAt" | "source"
> & {
	created?: SheetCreated & { paymentIds: string[]; goalIds?: string[] };
};

export type RemovedCounts = {
	removed: { transactions: number; transfers: number };
};

export interface IImportsRepository {
	transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
	findById(
		userId: string,
		id: string,
		options?: { source?: BatchRow["source"] },
	): Promise<BatchRow | undefined>;
	list(
		userId: string,
	): Promise<
		Pick<
			BatchRow,
			"id" | "status" | "createdAt" | "committedAt" | "summary" | "source"
		>[]
	>;
	committedSummaries(userId: string): Promise<unknown[]>;
	insert(row: NewBatchRow): Promise<BatchRow>;
	update(
		id: string,
		set: Partial<NewBatchRow>,
		exec?: DbExecutor,
	): Promise<void>;
	delete(id: string): Promise<void>;
	deleteAll(userId: string): Promise<void>;
}
