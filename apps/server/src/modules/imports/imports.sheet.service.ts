import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import { parseDebtsSheet } from "./imports.debts-sheet";
import { parseEmergencySheet } from "./imports.emergency-sheet";
import {
	itemKey,
	monthLabelPt,
	parseSalarySheet,
	readXlsx,
	recurringItems,
	ruleFor,
} from "./imports.salary-sheet";
import type {
	CommitSheetInput,
	SheetDebt,
	SheetGoal,
	SheetGoalPart,
	SheetImportInput,
	SheetMonthPreview,
	SheetPlanItem,
	SheetPreview,
} from "./imports.schema";
import type {
	BatchRow,
	IImportsRepository,
	RemovedCounts,
	SheetImportDeps,
	StoredSheetSummary,
} from "./imports.types";

const EMERGENCY_MONTHS = 3;
const ROUND_TO = 100_00;

function paymentDate(month: string) {
	const [y, m] = month.split("-").map(Number) as [number, number];
	const end = new Date(Date.UTC(y, m, 0, 10));
	return end > new Date() ? new Date() : end;
}

function toPreview(row: BatchRow): SheetPreview {
	const { created: _created, ...rest } = row.summary as StoredSheetSummary;
	return {
		...rest,
		goals: rest.goals ?? [],
		goalParts: rest.goalParts ?? [],
		goalAccountId: rest.goalAccountId ?? null,
		debts: rest.debts ?? [],
		id: row.id,
		source: "sheet-xlsx",
		status: row.status,
		createdAt: row.createdAt.toISOString(),
		committedAt: row.committedAt?.toISOString() ?? null,
	};
}

export class SheetImportService {
	constructor(
		private readonly repository: IImportsRepository,
		private readonly deps: SheetImportDeps,
	) {}

	private async findBatch(userId: string, id: string) {
		const row = await this.repository.findById(userId, id, {
			source: "sheet-xlsx",
		});
		if (!row) throw notFound("Importação da folha");
		return row;
	}

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
		const salary = sheets.find((s) => /sal[aá]rio/i.test(s.name)) ?? sheets[0];
		if (!salary) throw unprocessable("INVALID_XLSX", "A folha está vazia");
		const { months, skipped } = parseSalarySheet(salary, input.year);
		if (months.length === 0) {
			throw unprocessable(
				"NO_MONTHS",
				`Não encontrei meses na folha "${salary.name}" (coluna A com o nome do mês)`,
			);
		}

		await this.deps.categories.ensureDefaults(userId);
		const slugs = await this.deps.categories.idsBySlug(userId);
		const recurring = recurringItems(months);
		const accountIds = await this.deps.accounts.findByNames(
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
						plan?.categoryId ?? (rule ? (slugs.get(rule.slug) ?? null) : null),
					group: plan?.group ?? rule?.group ?? "oneoff",
					planKey: plan ? key : null,
					walletSpent: 0,
				};
			}),
		}));

		const matches = await this.deps.budgets.previewMatches(
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
		for (const m of monthPreviews) {
			for (const i of m.items)
				i.walletSpent = Math.min(
					i.amount,
					matches.get(`${m.month}|${i.key}`) ?? 0,
				);
			m.walletSpent = m.items.reduce((s, i) => s + i.walletSpent, 0);
			m.suggestPayments = false;
		}

		const emergencySheet = sheets.find(
			(s) => s !== salary && /emerg/i.test(s.name),
		);
		const { goals, goalParts } = emergencySheet
			? this.sheetGoals(emergencySheet, monthPreviews)
			: { goals: [], goalParts: [] };
		const debtsSheet = sheets.find(
			(s) => s !== salary && /d[ií]vida/i.test(s.name),
		);
		const debts: SheetDebt[] = debtsSheet
			? parseDebtsSheet(debtsSheet).map((d, index) => ({
					key: `divida:${index}`,
					...d,
				}))
			: [];
		const savings = (
			await this.deps.accounts.list(userId, { includeArchived: false })
		).find((a) => a.type === "savings");

		const stored: StoredSheetSummary = {
			fileName: input.name,
			year: input.year,
			sheetName: salary.name,
			otherSheets: sheets
				.filter((s) => s !== salary && s !== emergencySheet && s !== debtsSheet)
				.map((s) => s.name),
			planItems,
			months: monthPreviews,
			skipped,
			goals,
			goalParts,
			goalAccountId: savings?.id ?? null,
			debts,
		};
		const row = await this.repository.insert({
			userId,
			source: "sheet-xlsx",
			summary: stored,
		});
		return toPreview(row);
	}

	async get(userId: string, id: string) {
		return toPreview(await this.findBatch(userId, id));
	}

	async commit(userId: string, id: string, input: CommitSheetInput) {
		const batch = await this.findBatch(userId, id);
		if (batch.status !== "draft")
			throw conflict(
				"IMPORT_NOT_DRAFT",
				"Esta importação já foi aplicada ou desfeita",
			);
		const stored = batch.summary as StoredSheetSummary;
		const choice = new Map(input.months.map((m) => [m.month, m]));
		const included = stored.months.filter(
			(m) => choice.get(m.month)?.include ?? true,
		);
		const goalChoice = new Map(input.goals.map((g) => [g.key, g]));
		const includedGoals = (stored.goals ?? []).filter(
			(g) => goalChoice.get(g.key)?.include ?? true,
		);
		const debtChoice = new Map(input.debts.map((d) => [d.key, d.include]));
		const includedDebts = (stored.debts ?? []).filter(
			(d) => debtChoice.get(d.key) ?? true,
		);
		if (
			included.length === 0 &&
			includedGoals.length === 0 &&
			includedDebts.length === 0
		)
			throw unprocessable(
				"NOTHING_TO_IMPORT",
				"Escolha pelo menos um mês, uma meta ou uma dívida",
			);
		const goalAccountId = input.goalAccountId ?? stored.goalAccountId ?? null;
		if (includedGoals.length > 0 && !goalAccountId)
			throw unprocessable(
				"GOAL_ACCOUNT_REQUIRED",
				"Escolha a conta onde fica o dinheiro das metas",
			);
		const category = (key: string, guess: string | null) =>
			key in input.categories ? (input.categories[key] ?? null) : guess;

		const usedPlanKeys = new Set(
			included.flatMap((m) => m.items.map((i) => i.planKey).filter(Boolean)),
		);
		const { created, monthItemByKey } =
			included.length === 0
				? {
						created: { planId: null, planItemIds: [], monthItemIds: [] },
						monthItemByKey: new Map<string, string>(),
					}
				: await this.deps.budgets.applySheet(userId, {
						year: stored.year,
						expectedIncome: input.expectedIncome,
						planItems: stored.planItems
							.filter((p) => usedPlanKeys.has(p.key))
							.map((p) => ({
								...p,
								categoryId: category(p.key, p.categoryId),
							})),
						months: included.map((m) => ({
							month: m.month,
							items: m.items.map((i) => ({
								...i,
								categoryId: category(i.key, i.categoryId),
							})),
						})),
					});

		const paymentIds: string[] = [];
		let paymentsSkipped = 0;
		for (const m of included) {
			if (!(choice.get(m.month)?.createPayments ?? m.suggestPayments)) continue;
			for (const i of m.items) {
				const monthItemId = monthItemByKey.get(`${m.month}|${i.key}`);
				if (!monthItemId) continue;
				const before = await this.deps.budgets.getMonthItem(
					userId,
					monthItemId,
				);
				if (before.remaining <= 0) continue;
				const accountId = input.accountId ?? before.defaultAccountId;
				if (!accountId || accountId === before.toAccountId) {
					paymentsSkipped++;
					continue;
				}
				const after = await this.deps.budgets.pay(userId, monthItemId, {
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

		const goalIds: string[] = [];
		for (const goal of includedGoals) {
			const parts = (stored.goalParts ?? [])
				.filter(
					(p) =>
						(p.key in input.partGoals ? input.partGoals[p.key] : p.goalKey) ===
						goal.key,
				)
				.map((p) => ({
					name: p.name,
					amount: p.paid + p.missing,
					paid: p.missing === 0,
				}));
			goalIds.push(
				await this.deps.goals.importGoal(userId, {
					name: goal.name,
					target: goalChoice.get(goal.key)?.target ?? goal.target,
					startingAmount: goal.saved,
					accountId: goalAccountId!,
					importBatchId: id,
					parts,
				}),
			);
		}

		const debtIds: string[] = [];
		for (const debt of includedDebts)
			debtIds.push(
				await this.deps.debts.importDebt(userId, {
					person: debt.person,
					direction: debt.direction,
					amount: debt.amount,
					importBatchId: id,
				}),
			);

		const result = {
			monthItems: created.monthItemIds.length,
			planItems: created.planItemIds.length,
			payments: paymentIds.length,
			paymentsSkipped,
			goals: goalIds.length,
			debts: debtIds.length,
		};
		await this.repository.update(id, {
			status: "committed",
			committedAt: new Date(),
			summary: {
				...stored,
				result,
				created: { ...created, paymentIds, goalIds, debtIds },
			},
		});
		return this.get(userId, id);
	}

	private sheetGoals(
		sheet: Parameters<typeof parseEmergencySheet>[0],
		months: SheetMonthPreview[],
	): { goals: SheetGoal[]; goalParts: SheetGoalPart[] } {
		const parsed = parseEmergencySheet(sheet);
		const goals: SheetGoal[] = [];
		if (parsed.emergencySaved !== null) {
			const average = months.length
				? months.reduce((s, m) => s + m.total, 0) / months.length
				: 0;
			const suggested =
				Math.round((EMERGENCY_MONTHS * average) / ROUND_TO) * ROUND_TO;
			goals.push({
				key: "emergencia",
				name: "Fundo de emergência",
				saved: parsed.emergencySaved,
				target: Math.max(suggested, parsed.emergencySaved, ROUND_TO),
				suggestedTarget: true,
			});
		}
		for (const g of parsed.goals)
			goals.push({
				key: itemKey(g.name),
				name: g.name,
				saved: g.saved,
				target: g.target,
				suggestedTarget: false,
			});
		const defaultGoal =
			goals.find((g) => g.key !== "emergencia")?.key ?? goals[0]?.key ?? null;
		const goalParts: SheetGoalPart[] = parsed.parts.map((p) => ({
			key: `parte:${itemKey(p.name)}`,
			name: p.name,
			paid: p.paid,
			missing: p.missing,
			goalKey: defaultGoal,
		}));
		return { goals, goalParts };
	}

	async remove(userId: string, id: string): Promise<RemovedCounts> {
		const batch = await this.findBatch(userId, id);
		if (batch.status === "draft") {
			await this.repository.delete(id);
			return { removed: { transactions: 0, transfers: 0 } };
		}
		if (batch.status === "reverted")
			throw conflict("IMPORT_REVERTED", "Esta importação já foi desfeita");
		const created = (batch.summary as StoredSheetSummary).created;
		let transactions = 0;
		if (created) {
			for (const txId of created.paymentIds) {
				await this.deps.transactions.remove(userId, txId).then(
					() => transactions++,
					() => {},
				);
			}
			await this.deps.budgets.undoSheet(userId, created);
			await this.deps.goals.removeMany(userId, created.goalIds ?? []);
			await this.deps.debts.removeMany(userId, created.debtIds ?? []);
		}
		await this.repository.update(id, {
			status: "reverted",
			revertedAt: new Date(),
		});
		return { removed: { transactions, transfers: 0 } };
	}
}
