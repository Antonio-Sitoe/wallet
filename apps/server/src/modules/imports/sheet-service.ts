import type { Database } from "@wallet/db";
import { importBatches } from "@wallet/db/schema/imports";
import type {
	CommitSheetInput,
	MonthItem,
	SheetImportInput,
	SheetMonthPreview,
	SheetPlanItem,
	SheetPreview,
} from "@wallet/shared";
import { yearMonthOf } from "@wallet/shared";
import { and, eq } from "drizzle-orm";

import { conflict, notFound, unprocessable } from "../../lib/errors";
import {
	itemKey,
	monthLabelPt,
	parseSalarySheet,
	readXlsx,
	recurringItems,
	ruleFor,
} from "./salary-sheet";

type Group = SheetPlanItem["group"];

/** What the spreadsheet import needs from the other modules. */
export type SheetImportDeps = {
	accounts: {
		findByNames(userId: string, names: string[]): Promise<Map<string, string>>;
	};
	categories: {
		idsBySlug(userId: string): Promise<Map<string, string>>;
		ensureDefaults(userId: string): Promise<void>;
	};
	budgets: {
		previewMatches(
			userId: string,
			items: { id: string; month: string; categoryId: string | null; capacity?: number }[],
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
						group: Group;
					}[];
				}[];
			},
		): Promise<{
			created: {
				planId: string | null;
				planItemIds: string[];
				monthItemIds: string[];
			};
			monthItemByKey: Map<string, string>;
		}>;
		undoSheet(
			userId: string,
			created: {
				planId: string | null;
				planItemIds: string[];
				monthItemIds: string[];
			},
		): Promise<unknown>;
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

type Stored = Omit<
	SheetPreview,
	"id" | "status" | "createdAt" | "committedAt" | "source"
> & {
	created?: {
		planId: string | null;
		planItemIds: string[];
		monthItemIds: string[];
		paymentIds: string[];
	};
};

/** Last day of the month at noon, or now for the current month. */
function paymentDate(month: string) {
	const [y, m] = month.split("-").map(Number) as [number, number];
	const end = new Date(Date.UTC(y, m, 0, 10));
	return end > new Date() ? new Date() : end;
}

export function createSheetImportService(db: Database, deps: SheetImportDeps) {
	async function findBatch(userId: string, id: string) {
		const [row] = await db
			.select()
			.from(importBatches)
			.where(
				and(
					eq(importBatches.userId, userId),
					eq(importBatches.id, id),
					eq(importBatches.source, "sheet-xlsx"),
				),
			);
		if (!row) throw notFound("Importação da folha");
		return row;
	}

	const toPreview = (row: typeof importBatches.$inferSelect): SheetPreview => {
		const stored = row.summary as Stored;
		const { created: _created, ...rest } = stored;
		return {
			...rest,
			id: row.id,
			source: "sheet-xlsx",
			status: row.status,
			createdAt: row.createdAt.toISOString(),
			committedAt: row.committedAt?.toISOString() ?? null,
		};
	};

	const service = {
		async preview(
			userId: string,
			input: SheetImportInput,
		): Promise<SheetPreview> {
			let sheets: ReturnType<typeof readXlsx>;
			try {
				sheets = readXlsx(
					new Uint8Array(Buffer.from(input.contentBase64, "base64")),
				);
			} catch (error) {
				throw unprocessable(
					"INVALID_XLSX",
					error instanceof Error ? error.message : "Ficheiro inválido",
				);
			}
			const salary =
				sheets.find((s) => /sal[aá]rio/i.test(s.name)) ?? sheets[0];
			if (!salary) throw unprocessable("INVALID_XLSX", "A folha está vazia");
			const { months, skipped } = parseSalarySheet(salary, input.year);
			if (months.length === 0) {
				throw unprocessable(
					"NO_MONTHS",
					`Não encontrei meses na folha "${salary.name}" (coluna A com o nome do mês)`,
				);
			}

			await deps.categories.ensureDefaults(userId);
			const slugs = await deps.categories.idsBySlug(userId);
			const recurring = recurringItems(months);
			const accountIds = await deps.accounts.findByNames(
				userId,
				recurring.map((r) => r.rule?.toAccount).filter((v): v is string => !!v),
			);
			const planItems: SheetPlanItem[] = recurring.map((r) => ({
				key: r.key,
				name: r.name,
				amount: r.amount,
				months: r.months,
				group: r.rule?.group ?? "fixed",
				categoryId: r.rule ? (slugs.get(r.rule.slug) ?? null) : null,
				partial: r.rule?.partial ?? false,
				step: r.rule?.step ?? null,
				toAccountId: r.rule?.toAccount
					? (accountIds.get(r.rule.toAccount.toLowerCase()) ?? null)
					: null,
			}));
			const planByKey = new Map(planItems.map((p) => [p.key, p]));

			const monthPreviews: SheetMonthPreview[] = months.map((m) => ({
				month: m.month,
				label: monthLabelPt(m.month),
				total: m.items.reduce((s, i) => s + i.amount, 0),
				walletSpent: 0,
				suggestPayments: false,
				items: m.items.map((i) => {
					const key = itemKey(i.name);
					const plan = planByKey.get(key);
					const rule = ruleFor(i.name);
					return {
						key,
						name: i.name,
						amount: i.amount,
						categoryId:
							plan?.categoryId ??
							(rule ? (slugs.get(rule.slug) ?? null) : null),
						group: plan?.group ?? rule?.group ?? "oneoff",
						planKey: plan ? key : null,
						walletSpent: 0,
					};
				}),
			}));

			const matches = await deps.budgets.previewMatches(
				userId,
				monthPreviews.flatMap((m) =>
					m.items.map((i) => ({
						id: `${m.month}|${i.key}`,
						month: m.month,
						categoryId: i.categoryId,
						capacity: i.amount,
					})),
				),
			);
			const now = yearMonthOf(new Date());
			for (const m of monthPreviews) {
				for (const i of m.items)
					i.walletSpent = Math.min(
						i.amount,
						matches.get(`${m.month}|${i.key}`) ?? 0,
					);
				m.walletSpent = m.items.reduce((s, i) => s + i.walletSpent, 0);
				// Past months that the records barely cover were paid outside the app.
				m.suggestPayments = m.month < now && m.walletSpent < m.total * 0.5;
			}

			const stored: Stored = {
				fileName: input.name,
				year: input.year,
				sheetName: salary.name,
				otherSheets: sheets.filter((s) => s !== salary).map((s) => s.name),
				planItems,
				months: monthPreviews,
				skipped,
			};
			const [row] = await db
				.insert(importBatches)
				.values({ userId, source: "sheet-xlsx", summary: stored })
				.returning();
			return toPreview(row!);
		},

		async get(userId: string, id: string) {
			return toPreview(await findBatch(userId, id));
		},

		async commit(userId: string, id: string, input: CommitSheetInput) {
			const batch = await findBatch(userId, id);
			if (batch.status !== "draft")
				throw conflict(
					"IMPORT_NOT_DRAFT",
					"Esta importação já foi aplicada ou desfeita",
				);
			const stored = batch.summary as Stored;
			const choice = new Map(input.months.map((m) => [m.month, m]));
			const included = stored.months.filter(
				(m) => choice.get(m.month)?.include ?? true,
			);
			if (included.length === 0)
				throw unprocessable("NOTHING_TO_IMPORT", "Escolha pelo menos um mês");
			const category = (key: string, guess: string | null) =>
				key in input.categories ? (input.categories[key] ?? null) : guess;

			const usedPlanKeys = new Set(
				included.flatMap((m) => m.items.map((i) => i.planKey).filter(Boolean)),
			);
			const { created, monthItemByKey } = await deps.budgets.applySheet(
				userId,
				{
					year: stored.year,
					expectedIncome: input.expectedIncome,
					planItems: stored.planItems
						.filter((p) => usedPlanKeys.has(p.key))
						.map((p) => ({ ...p, categoryId: category(p.key, p.categoryId) })),
					months: included.map((m) => ({
						month: m.month,
						items: m.items.map((i) => ({
							...i,
							categoryId: category(i.key, i.categoryId),
						})),
					})),
				},
			);

			const paymentIds: string[] = [];
			let paymentsSkipped = 0;
			for (const m of included) {
				if (!(choice.get(m.month)?.createPayments ?? m.suggestPayments))
					continue;
				for (const i of m.items) {
					const monthItemId = monthItemByKey.get(`${m.month}|${i.key}`);
					if (!monthItemId) continue;
					const before = await deps.budgets.getMonthItem(userId, monthItemId);
					if (before.remaining <= 0) continue;
					const accountId = input.accountId ?? before.defaultAccountId;
					if (!accountId || accountId === before.toAccountId) {
						paymentsSkipped++;
						continue;
					}
					const after = await deps.budgets.pay(userId, monthItemId, {
						amount: before.remaining,
						accountId,
						occurredAt: paymentDate(m.month),
						note: "Folha Calculo Financeiro",
					});
					const known = new Set(before.payments.map((p) => p.transactionId));
					paymentIds.push(
						...after.payments
							.filter((p) => !known.has(p.transactionId))
							.map((p) => p.transactionId),
					);
				}
			}

			const result = {
				monthItems: created.monthItemIds.length,
				planItems: created.planItemIds.length,
				payments: paymentIds.length,
				paymentsSkipped,
			};
			await db
				.update(importBatches)
				.set({
					status: "committed",
					committedAt: new Date(),
					summary: { ...stored, result, created: { ...created, paymentIds } },
				})
				.where(eq(importBatches.id, id));
			return service.get(userId, id);
		},

		/** Draft: discard. Applied: delete the payments, month items, plan items and plan it created. */
		async remove(userId: string, id: string) {
			const batch = await findBatch(userId, id);
			if (batch.status === "draft") {
				await db.delete(importBatches).where(eq(importBatches.id, id));
				return { removed: { transactions: 0, transfers: 0 } };
			}
			if (batch.status === "reverted")
				throw conflict("IMPORT_REVERTED", "Esta importação já foi desfeita");
			const created = (batch.summary as Stored).created;
			let transactions = 0;
			if (created) {
				for (const txId of created.paymentIds) {
					await deps.transactions.remove(userId, txId).then(
						() => transactions++,
						() => {},
					);
				}
				await deps.budgets.undoSheet(userId, created);
			}
			await db
				.update(importBatches)
				.set({ status: "reverted", revertedAt: new Date() })
				.where(eq(importBatches.id, id));
			return { removed: { transactions, transfers: 0 } };
		},
	};
	return service;
}

export type SheetImportService = ReturnType<typeof createSheetImportService>;
