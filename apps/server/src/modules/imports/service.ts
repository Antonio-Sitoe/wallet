import type { Database, DbExecutor } from "@wallet/db";
import { importBatches } from "@wallet/db/schema/imports";
import type {
	AccountType,
	CommitImportInput,
	ImportBatchSummary,
	ImportPreview,
	WalletImportInput,
} from "@wallet/shared";
import { and, desc, eq } from "drizzle-orm";

import { conflict, notFound, unprocessable } from "../../lib/errors";
import {
	buildWalletPlan,
	guessAccountType,
	parseWalletCsv,
	TRANSFER_CATEGORY,
	type WalletPlan,
	type WalletPlanSummary,
} from "./wallet-csv";

type ImportedTransaction = {
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

type ImportedTransfer = {
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

/** What the importer needs from the other modules. */
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

type StoredSummary = WalletPlanSummary & {
	result?: {
		transactions: number;
		transfers: number;
		skippedDuplicates: number;
		ignored: number;
		/** Review rows the user chose to leave out; later uploads treat them as already decided. */
		ignoredHashes?: string[];
	};
};

type BatchRow = typeof importBatches.$inferSelect;

const allHashes = (plan: WalletPlan) => [
	...plan.transactions.map((t) => t.hash),
	...plan.transfers.flatMap((t) => [t.outHash, t.inHash]),
	...plan.review.map((r) => r.hash),
];

export function createImportsService(db: Database, deps: ImportsDeps) {
	async function findBatch(userId: string, id: string, exec: DbExecutor = db) {
		const [row] = await exec
			.select()
			.from(importBatches)
			.where(and(eq(importBatches.userId, userId), eq(importBatches.id, id)));
		if (!row) throw notFound("Importação");
		return row;
	}

	/** Rows left out on purpose in imports that are still applied. */
	async function ignoredHashes(userId: string) {
		const rows = await db
			.select({ summary: importBatches.summary })
			.from(importBatches)
			.where(
				and(
					eq(importBatches.userId, userId),
					eq(importBatches.status, "committed"),
				),
			);
		return rows.flatMap(
			(r) => (r.summary as StoredSummary).result?.ignoredHashes ?? [],
		);
	}

	/** Mapping and account matches are read live, so the preview reflects changes made after upload. */
	async function toPreview(
		userId: string,
		row: BatchRow,
	): Promise<ImportPreview> {
		const summary = row.summary as StoredSummary;
		const plan = row.plan as WalletPlan | null;
		const [walletMap, existingAccounts] = await Promise.all([
			deps.categories.getWalletMap(userId),
			deps.accounts.findByNames(
				userId,
				summary.accounts.map((a) => a.name),
			),
		]);
		const mapped = new Map(walletMap.map((m) => [m.walletName, m.categoryId]));
		return {
			id: row.id,
			status: row.status,
			createdAt: row.createdAt.toISOString(),
			committedAt: row.committedAt?.toISOString() ?? null,
			files: summary.files,
			totals: summary.totals,
			accounts: summary.accounts.map((a) => ({
				...a,
				existingAccountId: existingAccounts.get(a.name.toLowerCase()) ?? null,
			})),
			categories: summary.categories.map((c) => ({
				...c,
				categoryId: mapped.get(c.walletName) ?? null,
			})),
			review: (plan?.review ?? []).map((r) => ({
				key: r.hash,
				reason: r.reason,
				account: r.account,
				type: r.type,
				amount: r.amount,
				occurredAt: r.occurredAt,
				note: r.note,
			})),
		};
	}

	const service = {
		async createWalletImport(userId: string, input: WalletImportInput) {
			const parsed = input.files.map((f) => parseWalletCsv(f.name, f.content));
			const errors = parsed.flatMap((p) => p.errors);
			if (errors.length > 0) {
				throw unprocessable(
					"INVALID_CSV",
					"Há linhas que não se conseguem ler",
					errors.slice(0, 50),
				);
			}
			// The longest file usually holds the whole history; reading it first makes it the one credited with the rows.
			const files = parsed
				.map((p, i) => ({ name: input.files[i]!.name, rows: p.rows }))
				.sort((a, b) => b.rows.length - a.rows.length);
			const existing = await deps.transactions.existingImportHashes(
				userId,
				files.flatMap((f) => f.rows.map((r) => r.hash)),
			);
			for (const hash of await ignoredHashes(userId)) existing.add(hash);
			const { plan, summary } = buildWalletPlan(files, existing);
			// Warm the defaults so the preview can show which Wallet categories are already mapped.
			await deps.categories.getWalletMap(userId);
			const [row] = await db
				.insert(importBatches)
				.values({ userId, source: "wallet-csv", summary, plan })
				.returning();
			return toPreview(userId, row!);
		},

		async list(userId: string): Promise<ImportBatchSummary[]> {
			const rows = await db
				.select({
					id: importBatches.id,
					status: importBatches.status,
					createdAt: importBatches.createdAt,
					committedAt: importBatches.committedAt,
					summary: importBatches.summary,
				})
				.from(importBatches)
				.where(eq(importBatches.userId, userId))
				.orderBy(desc(importBatches.createdAt));
			return rows.map((r) => {
				const summary = r.summary as StoredSummary;
				return {
					id: r.id,
					status: r.status,
					createdAt: r.createdAt.toISOString(),
					committedAt: r.committedAt?.toISOString() ?? null,
					totals: summary.totals,
					fileNames: summary.files.map((f) => f.name),
				};
			});
		},

		async get(userId: string, id: string) {
			return toPreview(userId, await findBatch(userId, id));
		},

		async commit(userId: string, id: string, input: CommitImportInput) {
			const batch = await findBatch(userId, id);
			if (batch.status !== "draft")
				throw conflict(
					"IMPORT_NOT_DRAFT",
					"Esta importação já foi aplicada ou desfeita",
				);
			const plan = batch.plan as WalletPlan;
			const summary = batch.summary as StoredSummary;

			const resolutionTargets = Object.values(input.resolutions).flatMap((r) =>
				typeof r === "object" ? [r.transferTo] : [],
			);
			await deps.accounts.assertOwned(userId, resolutionTargets);

			const result = await db.transaction(async (tx) => {
				await deps.categories.setWalletMappings(
					userId,
					Object.entries(input.categoryMap).map(([walletName, categoryId]) => ({
						walletName,
						categoryId,
					})),
					tx,
				);
				const categoryOf = new Map(
					(await deps.categories.getWalletMap(userId, tx)).map((m) => [
						m.walletName,
						m.categoryId,
					]),
				);
				const transferCategory = await deps.categories.transferCategoryId(
					userId,
					tx,
				);
				const savingsCategory = await deps.categories.savingsCategoryId(
					userId,
					tx,
				);

				const unmapped = [
					...new Set(plan.transactions.map((t) => t.category)),
				].filter((name) => !categoryOf.get(name));
				if (unmapped.length > 0) {
					throw unprocessable(
						"UNMAPPED_CATEGORIES",
						"Escolha uma categoria para cada categoria do Wallet",
						unmapped,
					);
				}

				const names = [
					...plan.transactions.map((t) => t.account),
					...plan.transfers.flatMap((t) => [t.from, t.to]),
					...plan.review.map((r) => r.account),
				];
				const accountId = await deps.accounts.ensureByNames(
					userId,
					[...new Set(names)].map((name) => ({
						name,
						type: guessAccountType(name),
					})),
					tx,
				);
				const idOf = (name: string) => accountId.get(name.toLowerCase())!;

				// Another import may have landed since the preview: skip what is already there.
				const existing = await deps.transactions.existingImportHashes(
					userId,
					allHashes(plan),
					tx,
				);
				let skippedDuplicates = 0;
				const ignored: string[] = [];

				const transactions: ImportedTransaction[] = [];
				for (const t of plan.transactions) {
					if (existing.has(t.hash)) {
						skippedDuplicates++;
						continue;
					}
					transactions.push({
						accountId: idOf(t.account),
						categoryId: categoryOf.get(t.category) ?? null,
						type: t.type,
						amount: t.type === "expense" ? -t.amount : t.amount,
						occurredAt: new Date(t.occurredAt),
						referenceMonth: t.referenceMonth,
						note: t.note,
						payee: t.payee,
						labels: t.labels,
						paymentType: t.paymentType,
						currency: t.currency,
						refAmount: t.refAmount,
						importHash: t.hash,
					});
				}

				const transfers: ImportedTransfer[] = [];
				for (const t of plan.transfers) {
					if (existing.has(t.outHash) || existing.has(t.inHash)) {
						skippedDuplicates++;
						continue;
					}
					transfers.push({
						fromAccountId: idOf(t.from),
						toAccountId: idOf(t.to),
						categoryId:
							t.kind === "savings" ? savingsCategory : transferCategory,
						amount: t.amount,
						occurredAt: new Date(t.occurredAt),
						referenceMonth: t.referenceMonth,
						note: t.note,
						outHash: t.outHash,
						inHash: t.inHash,
					});
				}

				for (const r of plan.review) {
					const decision = input.resolutions[r.hash] ?? "ignore";
					if (existing.has(r.hash)) continue;
					if (decision === "ignore") {
						ignored.push(r.hash);
						continue;
					}
					if (decision === "keep") {
						transactions.push({
							accountId: idOf(r.account),
							categoryId: categoryOf.get(TRANSFER_CATEGORY) ?? transferCategory,
							type: r.type,
							amount: r.type === "expense" ? -r.amount : r.amount,
							occurredAt: new Date(r.occurredAt),
							referenceMonth: r.referenceMonth,
							note: r.note,
							payee: r.payee,
							labels: r.labels,
							paymentType: r.paymentType,
							currency: r.currency,
							refAmount: r.refAmount,
							importHash: r.hash,
						});
					} else {
						const own = idOf(r.account);
						if (decision.transferTo === own) {
							throw unprocessable(
								"SAME_ACCOUNT",
								"O outro lado da transferência tem de ser outra conta",
								r.hash,
							);
						}
						const out = r.type === "expense";
						transfers.push({
							fromAccountId: out ? own : decision.transferTo,
							toAccountId: out ? decision.transferTo : own,
							categoryId: transferCategory,
							amount: r.amount,
							occurredAt: new Date(r.occurredAt),
							referenceMonth: r.referenceMonth,
							note: r.note,
							outHash: out ? r.hash : `${r.hash}:pair`,
							inHash: out ? `${r.hash}:pair` : r.hash,
						});
					}
				}

				const inserted = await deps.transactions.insertImported(
					tx,
					userId,
					id,
					{ transactions, transfers },
				);
				const outcome = {
					...inserted,
					skippedDuplicates,
					ignored: ignored.length,
				};
				await tx
					.update(importBatches)
					.set({
						status: "committed",
						committedAt: new Date(),
						plan: null,
						summary: {
							...summary,
							result: { ...outcome, ignoredHashes: ignored },
						},
					})
					.where(eq(importBatches.id, id));
				return outcome;
			});
			return { ...(await service.get(userId, id)), result };
		},

		/** A draft is discarded; a committed import is undone (its transactions and transfers are deleted). */
		async remove(userId: string, id: string) {
			const batch = await findBatch(userId, id);
			if (batch.status === "draft") {
				await db.delete(importBatches).where(eq(importBatches.id, id));
				return { removed: { transactions: 0, transfers: 0 } };
			}
			if (batch.status === "reverted")
				throw conflict("IMPORT_REVERTED", "Esta importação já foi desfeita");
			const removed = await db.transaction(async (tx) => {
				const counts = await deps.transactions.deleteByImportBatch(
					tx,
					userId,
					id,
				);
				await tx
					.update(importBatches)
					.set({ status: "reverted", revertedAt: new Date() })
					.where(eq(importBatches.id, id));
				return counts;
			});
			return { removed };
		},
	};
	return service;
}

export type ImportsService = ReturnType<typeof createImportsService>;
