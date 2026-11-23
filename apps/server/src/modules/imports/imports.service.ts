import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import type {
	CommitImportInput,
	ImportBatchSummary,
	ImportPreview,
	WalletImportInput,
} from "./imports.schema";
import type {
	BatchRow,
	IImportsRepository,
	ImportedTransaction,
	ImportedTransfer,
	ImportsDeps,
	RemovedCounts,
	StoredWalletSummary,
} from "./imports.types";
import {
	buildWalletPlan,
	guessAccountType,
	parseWalletCsv,
	TRANSFER_CATEGORY,
	type WalletPlan,
} from "./imports.wallet-csv";

const allHashes = (plan: WalletPlan) => [
	...plan.transactions.map((t) => t.hash),
	...plan.transfers.flatMap((t) => [t.outHash, t.inHash]),
	...plan.review.map((r) => r.hash),
];

export class ImportsService {
	constructor(
		private readonly repository: IImportsRepository,
		private readonly deps: ImportsDeps,
		private readonly sheet: {
			remove(userId: string, id: string): Promise<RemovedCounts>;
		},
	) {}

	private async findBatch(userId: string, id: string) {
		const row = await this.repository.findById(userId, id);
		if (!row) throw notFound("Importação");
		return row;
	}

	private async ignoredHashes(userId: string) {
		const summaries = await this.repository.committedSummaries(userId);
		return summaries.flatMap(
			(s) => (s as StoredWalletSummary).result?.ignoredHashes ?? [],
		);
	}

	private async toPreview(
		userId: string,
		row: BatchRow,
	): Promise<ImportPreview> {
		const summary = row.summary as StoredWalletSummary;
		const plan = row.plan as WalletPlan | null;
		const [walletMap, existingAccounts] = await Promise.all([
			this.deps.categories.getWalletMap(userId),
			this.deps.accounts.findByNames(
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
		const files = parsed
			.map((p, i) => ({ name: input.files[i]!.name, rows: p.rows }))
			.sort((a, b) => b.rows.length - a.rows.length);
		const existing = await this.deps.transactions.existingImportHashes(
			userId,
			files.flatMap((f) => f.rows.map((r) => r.hash)),
		);
		for (const hash of await this.ignoredHashes(userId)) existing.add(hash);
		const { plan, summary } = buildWalletPlan(files, existing);
		await this.deps.categories.getWalletMap(userId);
		const row = await this.repository.insert({
			userId,
			source: "wallet-csv",
			summary,
			plan,
		});
		return this.toPreview(userId, row);
	}

	async list(userId: string): Promise<ImportBatchSummary[]> {
		const rows = await this.repository.list(userId);
		return rows.map((r): ImportBatchSummary => {
			if (r.source === "sheet-xlsx") {
				const sheetSummary = r.summary as {
					fileName: string;
					year: number;
					months: { items: unknown[] }[];
				};
				const items = sheetSummary.months.reduce(
					(n, m) => n + m.items.length,
					0,
				);
				return {
					id: r.id,
					source: "sheet-xlsx",
					status: r.status,
					createdAt: r.createdAt.toISOString(),
					committedAt: r.committedAt?.toISOString() ?? null,
					totals: {
						rows: items,
						new: items,
						duplicate: 0,
						transactions: 0,
						transferPairs: 0,
						savingsTransfers: 0,
						referenceMonthFromNote: 0,
						debtNotes: 0,
						toReview: 0,
					},
					fileNames: [sheetSummary.fileName],
					sheet: {
						year: sheetSummary.year,
						months: sheetSummary.months.length,
						items,
					},
				};
			}
			const summary = r.summary as StoredWalletSummary;
			return {
				source: "wallet-csv",
				id: r.id,
				status: r.status,
				createdAt: r.createdAt.toISOString(),
				committedAt: r.committedAt?.toISOString() ?? null,
				totals: summary.totals,
				fileNames: summary.files.map((f) => f.name),
			};
		});
	}

	async get(userId: string, id: string) {
		return this.toPreview(userId, await this.findBatch(userId, id));
	}

	async commit(userId: string, id: string, input: CommitImportInput) {
		const batch = await this.findBatch(userId, id);
		if (batch.status !== "draft")
			throw conflict(
				"IMPORT_NOT_DRAFT",
				"Esta importação já foi aplicada ou desfeita",
			);
		const plan = batch.plan as WalletPlan;
		const summary = batch.summary as StoredWalletSummary;

		const resolutionTargets = Object.values(input.resolutions).flatMap((r) =>
			typeof r === "object" ? [r.transferTo] : [],
		);
		await this.deps.accounts.assertOwned(userId, resolutionTargets);

		const result = await this.repository.transaction(async (tx) => {
			await this.deps.categories.setWalletMappings(
				userId,
				Object.entries(input.categoryMap).map(([walletName, categoryId]) => ({
					walletName,
					categoryId,
				})),
				tx,
			);
			const categoryOf = new Map(
				(await this.deps.categories.getWalletMap(userId, tx)).map((m) => [
					m.walletName,
					m.categoryId,
				]),
			);
			const transferCategory = await this.deps.categories.transferCategoryId(
				userId,
				tx,
			);
			const savingsCategory = await this.deps.categories.savingsCategoryId(
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
			const accountId = await this.deps.accounts.ensureByNames(
				userId,
				[...new Set(names)].map((name) => ({
					name,
					type: guessAccountType(name),
				})),
				tx,
			);
			const idOf = (name: string) => accountId.get(name.toLowerCase())!;

			const existing = await this.deps.transactions.existingImportHashes(
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
					categoryId: t.kind === "savings" ? savingsCategory : transferCategory,
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

			const inserted = await this.deps.transactions.insertImported(
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
			await this.repository.update(
				id,
				{
					status: "committed",
					committedAt: new Date(),
					plan: null,
					summary: {
						...summary,
						result: { ...outcome, ignoredHashes: ignored },
					},
				},
				tx,
			);
			return outcome;
		});
		return { ...(await this.get(userId, id)), result };
	}

	async wipe(userId: string) {
		await this.repository.deleteAll(userId);
	}

	async remove(userId: string, id: string) {
		const batch = await this.findBatch(userId, id);
		if (batch.source === "sheet-xlsx") return this.sheet.remove(userId, id);
		if (batch.status === "draft") {
			await this.repository.delete(id);
			return { removed: { transactions: 0, transfers: 0 } };
		}
		if (batch.status === "reverted")
			throw conflict("IMPORT_REVERTED", "Esta importação já foi desfeita");
		const removed = await this.repository.transaction(async (tx) => {
			const counts = await this.deps.transactions.deleteByImportBatch(
				tx,
				userId,
				id,
			);
			await this.repository.update(
				id,
				{ status: "reverted", revertedAt: new Date() },
				tx,
			);
			return counts;
		});
		return { removed };
	}
}
