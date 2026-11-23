import { formatYearMonth, parseYearMonth, yearMonthOf } from "@wallet/shared";

import { isUniqueViolation } from "../../shared/database/pg-errors";
import {
	conflict,
	notFound,
	unprocessable,
} from "../../shared/errors/app-error";
import {
	ALL_MONTHS,
	attributeSpending,
	itemStatus,
	monthsFor,
	pace,
} from "./budgets.compute";
import type {
	CreateMonthItemInput,
	CreatePlanInput,
	CreatePlanItemInput,
	MonthBudget,
	MonthItem,
	PayMonthItemInput,
	Plan,
	PlanItem,
	PlanItemYear,
	UpdateMonthItemInput,
	UpdatePlanItemInput,
} from "./budgets.schema";
import type {
	BudgetsDeps,
	IBudgetsRepository,
	MonthItemRow,
	PlanItemRow,
	PlanRow,
} from "./budgets.types";

const currentMonth = () => yearMonthOf(new Date());
const monthsOfYear = (year: number) =>
	ALL_MONTHS.map((m) => formatYearMonth(year, m));

function toPlanItem(row: PlanItemRow): PlanItem {
	return {
		id: row.id,
		name: row.name,
		group: row.group,
		categoryId: row.categoryId,
		amount: row.amount,
		frequency: row.frequency,
		months: monthsFor(row),
		accountId: row.accountId,
		toAccountId: row.toAccountId,
		partial: row.partial,
		step: row.step,
		sortOrder: row.sortOrder,
	};
}

const fromPlanItem = (item: PlanItemRow) => ({
	name: item.name,
	group: item.group,
	categoryId: item.categoryId,
	accountId: item.accountId,
	toAccountId: item.toAccountId,
	plannedAmount: item.amount,
	partial: item.partial,
	step: item.step,
	sortOrder: item.sortOrder,
});

export class BudgetsService {
	constructor(
		private readonly repository: IBudgetsRepository,
		private readonly deps: BudgetsDeps,
	) {}

	private async findPlan(userId: string, year: number) {
		const row = await this.repository.findPlan(userId, year);
		if (!row) throw notFound(`Plano de ${year}`);
		return row;
	}

	private async findPlanItem(userId: string, id: string) {
		const row = await this.repository.findPlanItem(userId, id);
		if (!row) throw notFound("Item do plano");
		return row;
	}

	private async findMonthItem(userId: string, id: string) {
		const row = await this.repository.findMonthItem(userId, id);
		if (!row) throw notFound("Item do mês");
		return row;
	}

	private async assertRefs(
		userId: string,
		refs: {
			categoryId?: string | null;
			accountId?: string | null;
			toAccountId?: string | null;
		},
	) {
		if (refs.categoryId)
			await this.deps.categories.assertOwned(userId, [refs.categoryId]);
		const accounts = [refs.accountId, refs.toAccountId].filter(
			(v): v is string => !!v,
		);
		await this.deps.accounts.assertOwned(userId, accounts);
		if (refs.accountId && refs.accountId === refs.toAccountId) {
			throw unprocessable(
				"SAME_ACCOUNT",
				"A conta de origem e a de destino têm de ser diferentes",
			);
		}
	}

	private async paidIds(userId: string, ids: string[]) {
		const payments = await this.deps.transactions.linkedPayments(userId, ids);
		return new Set(payments.map((p) => p.monthItemId));
	}

	private async materialize(
		userId: string,
		plan: PlanRow,
		items: PlanItemRow[],
		fromMonth?: string,
	) {
		if (items.length === 0) return 0;
		const existing = await this.repository.existingMonths(
			items.map((i) => i.id),
		);
		const have = new Set(existing.map((e) => `${e.planItemId}|${e.month}`));
		const values = items.flatMap((item) =>
			monthsFor(item)
				.map((m) => formatYearMonth(plan.year, m))
				.filter(
					(month) =>
						(!fromMonth || month >= fromMonth) &&
						!have.has(`${item.id}|${month}`),
				)
				.map((month) => ({
					userId,
					planId: plan.id,
					planItemId: item.id,
					month,
					...fromPlanItem(item),
				})),
		);
		await this.repository.insertMonthItems(values);
		return values.length;
	}

	private async viewMonthItems(
		userId: string,
		rows: MonthItemRow[],
		months: string[],
	) {
		const planItemIds = [
			...new Set(rows.map((r) => r.planItemId).filter((v): v is string => !!v)),
		];
		const siblings = await this.repository.siblingsOf(userId, planItemIds);
		const allIds = [
			...new Set([...rows.map((r) => r.id), ...siblings.map((s) => s.id)]),
		];
		const [payments, activity, parents] = await Promise.all([
			this.deps.transactions.linkedPayments(userId, allIds),
			this.deps.transactions.monthActivity(userId, months),
			this.deps.categories.parentMap(userId),
		]);
		const linkedByItem = new Map<string, number>();
		for (const p of payments)
			linkedByItem.set(
				p.monthItemId,
				(linkedByItem.get(p.monthItemId) ?? 0) - p.amount,
			);
		const { matched, unassigned } = attributeSpending(
			rows.map((r) => ({
				...r,
				capacity: Math.max(0, r.plannedAmount - (linkedByItem.get(r.id) ?? 0)),
			})),
			activity.unlinkedOut,
			parents,
		);

		const planItemOf = new Map(siblings.map((s) => [s.id, s.planItemId]));
		const lastAccount = new Map<string, string>();
		for (const p of payments) {
			const key = planItemOf.get(p.monthItemId) ?? p.monthItemId;
			if (!lastAccount.has(key)) lastAccount.set(key, p.accountId);
		}

		const items: MonthItem[] = rows.map((row) => {
			const own = payments.filter((p) => p.monthItemId === row.id);
			const linkedSpent = -own.reduce((s, p) => s + p.amount, 0);
			const matchedSpent = matched.get(row.id) ?? 0;
			const spent = linkedSpent + matchedSpent;
			return {
				id: row.id,
				month: row.month,
				planItemId: row.planItemId,
				name: row.name,
				group: row.group,
				categoryId: row.categoryId,
				accountId: row.accountId,
				toAccountId: row.toAccountId,
				defaultAccountId:
					lastAccount.get(row.planItemId ?? row.id) ?? row.accountId,
				plannedAmount: row.plannedAmount,
				partial: row.partial,
				step: row.step,
				unplanned: row.unplanned,
				spent,
				linkedSpent,
				matchedSpent,
				remaining: Math.max(0, row.plannedAmount - spent),
				status: itemStatus(spent, row.plannedAmount),
				checked: !row.partial && spent > 0,
				payments: own.map((p) => ({
					transactionId: p.transactionId,
					transferId: p.transferId,
					accountId: p.accountId,
					amount: -p.amount,
					occurredAt: p.occurredAt.toISOString(),
					note: p.note,
				})),
			};
		});
		return { items, unassigned, income: activity.income };
	}

	async listPlans(userId: string) {
		const rows = await this.repository.listPlans(userId);
		return Promise.all(
			rows.map(async (p) => ({
				id: p.id,
				year: p.year,
				expectedIncome: p.expectedIncome,
				generated: await this.repository.planIsGenerated(p.id),
			})),
		);
	}

	async createPlan(userId: string, input: CreatePlanInput) {
		let plan: PlanRow;
		try {
			plan = await this.repository.insertPlan({
				userId,
				year: input.year,
				expectedIncome: input.expectedIncome,
			});
		} catch (error) {
			if (isUniqueViolation(error))
				throw conflict("PLAN_EXISTS", `Já existe um plano para ${input.year}`);
			throw error;
		}
		if (input.copyFrom !== undefined) {
			const source = await this.findPlan(userId, input.copyFrom);
			const items = await this.repository.listPlanItems(source.id);
			const copied = items.filter(
				(i) =>
					i.frequency === "monthly" ||
					(i.frequency === "months" && input.copySeasonal) ||
					(i.frequency === "once" && input.copyOneOff),
			);
			await this.repository.insertPlanItems(
				copied.map(
					({ id: _id, planId: _p, createdAt: _c, updatedAt: _u, ...rest }) => ({
						...rest,
						planId: plan.id,
					}),
				),
			);
			if (input.expectedIncome === 0) {
				await this.repository.updatePlan(plan.id, {
					expectedIncome: source.expectedIncome,
				});
			}
		}
		return this.getPlan(userId, input.year);
	}

	async updatePlan(
		userId: string,
		year: number,
		input: { expectedIncome: number },
	) {
		const plan = await this.findPlan(userId, year);
		await this.repository.updatePlan(plan.id, input);
		return this.getPlan(userId, year);
	}

	async deletePlan(userId: string, year: number) {
		const plan = await this.findPlan(userId, year);
		const ids = await this.repository.monthItemIdsOfPlan(plan.id);
		if ((await this.paidIds(userId, ids)).size > 0) {
			throw conflict(
				"PLAN_HAS_PAYMENTS",
				"O plano tem itens pagos; desmarque-os primeiro ou edite os itens em vez de apagar o plano",
			);
		}
		await this.repository.deletePlan(plan.id);
	}

	async getPlan(
		userId: string,
		year: number,
		asOf = currentMonth(),
	): Promise<Plan> {
		const plan = await this.findPlan(userId, year);
		const items = await this.repository.listPlanItems(plan.id);
		const months = monthsOfYear(year);
		const rows = (await this.repository.listMonthItems(userId, months)).filter(
			(r) => r.planId === plan.id,
		);
		const { items: views } = await this.viewMonthItems(userId, rows, months);
		const viewById = new Map(views.map((v) => [v.id, v]));

		const yearItems: PlanItemYear[] = items.map((item) => {
			const own = rows.filter((r) => r.planItemId === item.id);
			const byMonth = monthsFor(item).map((m) => {
				const month = formatYearMonth(year, m);
				const row = own.find((r) => r.month === month);
				const view = row ? viewById.get(row.id) : undefined;
				const planned = row?.plannedAmount ?? item.amount;
				const spent = view?.spent ?? 0;
				return { month, planned, spent, status: itemStatus(spent, planned) };
			});
			const upTo = byMonth.filter((m) => m.month <= asOf);
			const plannedToDate = upTo.reduce((s, m) => s + m.planned, 0);
			const spentToDate = upTo.reduce((s, m) => s + m.spent, 0);
			const p = pace(spentToDate, plannedToDate);
			return {
				...toPlanItem(item),
				projected: byMonth.reduce((s, m) => s + m.planned, 0),
				plannedToDate,
				spentToDate,
				pace: p.pace,
				pacePercent: p.percent,
				byMonth,
			};
		});

		const monthSummary = months.map((month) => {
			const entries = yearItems.flatMap((i) =>
				i.byMonth.filter((m) => m.month === month),
			);
			const planned = entries.reduce((s, m) => s + m.planned, 0);
			return {
				month,
				items: entries.length,
				planned,
				overIncome: plan.expectedIncome > 0 && planned > plan.expectedIncome,
			};
		});
		const total = yearItems.reduce((s, i) => s + i.projected, 0);
		return {
			id: plan.id,
			year,
			expectedIncome: plan.expectedIncome,
			generated: rows.some((r) => r.planItemId !== null),
			asOf,
			items: yearItems,
			totals: {
				year: total,
				monthlyAverage: Math.round(total / 12),
				itemsOverPace: yearItems.filter((i) => i.pace === "over").length,
			},
			months: monthSummary,
		};
	}

	async generate(userId: string, year: number) {
		const plan = await this.findPlan(userId, year);
		const items = await this.repository.listPlanItems(plan.id);
		const created = await this.materialize(userId, plan, items);
		return { created, plan: await this.getPlan(userId, year) };
	}

	async addPlanItem(userId: string, year: number, input: CreatePlanItemInput) {
		const plan = await this.findPlan(userId, year);
		await this.assertRefs(userId, input);
		const item = await this.repository.insertPlanItem({
			userId,
			planId: plan.id,
			...input,
			sortOrder: await this.repository.countPlanItems(plan.id),
		});
		if (await this.repository.planIsGenerated(plan.id))
			await this.materialize(userId, plan, [item], currentMonth());
		return toPlanItem(item);
	}

	async updatePlanItem(userId: string, id: string, input: UpdatePlanItemInput) {
		const { item, plan } = await this.findPlanItem(userId, id);
		const { applyFrom = currentMonth(), ...changes } = input;
		await this.assertRefs(userId, {
			categoryId: changes.categoryId,
			accountId: changes.accountId ?? item.accountId,
			toAccountId: changes.toAccountId ?? item.toAccountId,
		});
		const next = await this.repository.updatePlanItem(id, changes);
		if (!(await this.repository.planIsGenerated(plan.id)))
			return toPlanItem(next);

		const future = await this.repository.monthItemsFrom(id, applyFrom);
		const paid = await this.paidIds(
			userId,
			future.map((f) => f.id),
		);
		const applies = new Set(
			monthsFor(next).map((m) => formatYearMonth(plan.year, m)),
		);
		for (const row of future) {
			if (paid.has(row.id)) continue;
			if (applies.has(row.month)) {
				await this.repository.updateMonthItem(row.id, fromPlanItem(next));
			} else {
				await this.repository.deleteMonthItems(userId, [row.id]);
			}
		}
		await this.materialize(userId, plan, [next], applyFrom);
		return toPlanItem(next);
	}

	async deletePlanItem(userId: string, id: string, applyFrom = currentMonth()) {
		await this.findPlanItem(userId, id);
		const future = await this.repository.monthItemsFrom(id, applyFrom);
		const paid = await this.paidIds(
			userId,
			future.map((f) => f.id),
		);
		await this.repository.deleteMonthItems(
			userId,
			future.map((f) => f.id).filter((fid) => !paid.has(fid)),
		);
		await this.repository.deletePlanItem(id);
	}

	async getMonth(userId: string, month: string): Promise<MonthBudget> {
		const { year } = parseYearMonth(month);
		const plan = await this.repository.findPlan(userId, year);
		const rows = await this.repository.listMonthItems(userId, [month]);
		const { items, unassigned, income } = await this.viewMonthItems(
			userId,
			rows,
			[month],
		);
		const planned = items.reduce((s, i) => s + i.plannedAmount, 0);
		const spent = items.reduce((s, i) => s + i.spent, 0);
		const expectedIncome = plan?.expectedIncome ?? 0;
		return {
			month,
			planYear: plan?.year ?? null,
			hasList: rows.length > 0,
			expectedIncome,
			income: income.get(month) ?? 0,
			totals: {
				planned,
				spent,
				remaining: items.reduce((s, i) => s + i.remaining, 0),
				unplanned: items
					.filter((i) => i.unplanned)
					.reduce((s, i) => s + i.plannedAmount, 0),
				unassignedSpent: unassigned.get(month) ?? 0,
				leftover: expectedIncome - planned,
			},
			items,
		};
	}

	async getMonthItem(userId: string, id: string) {
		const row = await this.findMonthItem(userId, id);
		const { items } = await this.viewMonthItems(userId, [row], [row.month]);
		return items[0]!;
	}

	async addMonthItem(
		userId: string,
		month: string,
		input: CreateMonthItemInput,
	) {
		await this.assertRefs(userId, input);
		const { year } = parseYearMonth(month);
		const plan = await this.repository.findPlan(userId, year);
		const { amount, ...rest } = input;
		const row = await this.repository.insertMonthItem({
			userId,
			planId: plan?.id ?? null,
			month,
			...rest,
			plannedAmount: amount,
			unplanned: true,
			sortOrder: 1000,
		});
		return this.getMonthItem(userId, row.id);
	}

	async updateMonthItem(
		userId: string,
		id: string,
		input: UpdateMonthItemInput,
	) {
		const row = await this.findMonthItem(userId, id);
		await this.assertRefs(userId, {
			categoryId: input.categoryId,
			accountId: input.accountId ?? row.accountId,
			toAccountId: input.toAccountId ?? row.toAccountId,
		});
		await this.repository.updateMonthItem(id, input);
		return this.getMonthItem(userId, id);
	}

	async deleteMonthItem(userId: string, id: string) {
		await this.findMonthItem(userId, id);
		if ((await this.paidIds(userId, [id])).size > 0) {
			throw conflict(
				"MONTH_ITEM_HAS_PAYMENTS",
				"Desmarque o item (apaga os pagamentos) antes de o remover",
			);
		}
		await this.repository.deleteMonthItems(userId, [id]);
	}

	async pay(userId: string, id: string, input: PayMonthItemInput) {
		const item = await this.getMonthItem(userId, id);
		const amount =
			input.amount ??
			(item.partial ? (item.step ?? item.remaining) : item.remaining);
		const accountId = input.accountId ?? item.defaultAccountId;
		if (!accountId)
			throw unprocessable(
				"ACCOUNT_REQUIRED",
				"Escolha a conta de onde sai o dinheiro",
			);
		if (amount <= 0)
			throw unprocessable(
				"NOTHING_TO_PAY",
				"O item já está pago; indique o valor a lançar",
			);
		const occurredAt = input.occurredAt ?? new Date();
		const note = input.note ?? null;
		if (item.toAccountId) {
			if (item.toAccountId === accountId) {
				throw unprocessable(
					"SAME_ACCOUNT",
					"A conta de origem e a de destino têm de ser diferentes",
				);
			}
			await this.deps.transactions.createTransfer(userId, {
				fromAccountId: accountId,
				toAccountId: item.toAccountId,
				amount,
				occurredAt,
				referenceMonth: item.month,
				note,
				monthItemId: id,
			});
		} else {
			await this.deps.transactions.create(userId, {
				type: "expense",
				accountId,
				categoryId: item.categoryId,
				amount,
				occurredAt,
				referenceMonth: item.month,
				note,
				payee: null,
				monthItemId: id,
			});
		}
		return this.getMonthItem(userId, id);
	}

	async unpay(userId: string, id: string) {
		const item = await this.getMonthItem(userId, id);
		for (const p of item.payments)
			await this.deps.transactions.remove(userId, p.transactionId);
		return this.getMonthItem(userId, id);
	}

	async removePayment(userId: string, id: string, transactionId: string) {
		const item = await this.getMonthItem(userId, id);
		if (!item.payments.some((p) => p.transactionId === transactionId)) {
			throw notFound("Pagamento deste item");
		}
		await this.deps.transactions.remove(userId, transactionId);
		return this.getMonthItem(userId, id);
	}

	async previewMatches(
		userId: string,
		items: {
			id: string;
			month: string;
			categoryId: string | null;
			capacity?: number;
		}[],
	) {
		const months = [...new Set(items.map((i) => i.month))];
		const [activity, parents] = await Promise.all([
			this.deps.transactions.monthActivity(userId, months),
			this.deps.categories.parentMap(userId),
		]);
		return attributeSpending(items, activity.unlinkedOut, parents).matched;
	}

	async applySheet(
		userId: string,
		input: {
			year: number;
			expectedIncome?: number;
			planItems: (Omit<CreatePlanItemInput, "months" | "frequency"> & {
				key: string;
				months: number[];
			})[];
			months: {
				month: string;
				items: {
					key: string;
					planKey: string | null;
					name: string;
					amount: number;
					categoryId: string | null;
					group: CreatePlanItemInput["group"];
				}[];
			}[];
		},
	) {
		const created = {
			planId: null as string | null,
			planItemIds: [] as string[],
			monthItemIds: [] as string[],
		};
		let plan = await this.repository.findPlan(userId, input.year);
		if (!plan) {
			plan = await this.repository.insertPlan({
				userId,
				year: input.year,
				expectedIncome: input.expectedIncome ?? 0,
			});
			created.planId = plan.id;
		}
		const existing = await this.repository.listPlanItems(plan.id);
		const sameName = (a: string, b: string) =>
			a.trim().toLowerCase() === b.trim().toLowerCase();
		const planIdByKey = new Map<string, PlanItemRow>();
		for (const [i, item] of input.planItems.entries()) {
			const found = existing.find((e) => sameName(e.name, item.name));
			if (found) {
				planIdByKey.set(item.key, found);
				continue;
			}
			const { key: _key, months, ...fields } = item;
			const row = await this.repository.insertPlanItem({
				userId,
				planId: plan.id,
				...fields,
				frequency: months.length === 12 ? "monthly" : "months",
				months: months.length === 12 ? [] : months,
				sortOrder: existing.length + i,
			});
			planIdByKey.set(item.key, row);
			created.planItemIds.push(row.id);
		}

		const monthItemByKey = new Map<string, string>();
		for (const m of input.months) {
			const current = await this.repository.listMonthItems(userId, [m.month]);
			for (const [i, item] of m.items.entries()) {
				const planItem = item.planKey
					? planIdByKey.get(item.planKey)
					: undefined;
				const match = current.find((c) =>
					planItem ? c.planItemId === planItem.id : sameName(c.name, item.name),
				);
				if (match) {
					if ((await this.paidIds(userId, [match.id])).size === 0) {
						await this.repository.updateMonthItem(match.id, {
							plannedAmount: item.amount,
						});
					}
					monthItemByKey.set(`${m.month}|${item.key}`, match.id);
					continue;
				}
				const row = await this.repository.insertMonthItem({
					userId,
					planId: plan.id,
					planItemId: planItem?.id ?? null,
					month: m.month,
					name: item.name,
					group: planItem?.group ?? item.group,
					categoryId: item.categoryId ?? planItem?.categoryId ?? null,
					accountId: planItem?.accountId ?? null,
					toAccountId: planItem?.toAccountId ?? null,
					plannedAmount: item.amount,
					partial: planItem?.partial ?? false,
					step: planItem?.step ?? null,
					unplanned: !planItem,
					sortOrder: planItem ? planItem.sortOrder : 1000 + i,
				});
				created.monthItemIds.push(row.id);
				monthItemByKey.set(`${m.month}|${item.key}`, row.id);
			}
		}
		return { planYear: input.year, created, monthItemByKey };
	}

	async undoSheet(
		userId: string,
		created: {
			planId: string | null;
			planItemIds: string[];
			monthItemIds: string[];
		},
	) {
		const payments = await this.deps.transactions.linkedPayments(
			userId,
			created.monthItemIds,
		);
		for (const p of payments)
			await this.deps.transactions
				.remove(userId, p.transactionId)
				.catch(() => {});
		await this.repository.deleteMonthItems(userId, created.monthItemIds);
		await this.repository.deletePlanItems(userId, created.planItemIds);
		if (created.planId) {
			const inUse =
				(await this.repository.planHasMonthItems(created.planId)) ||
				(await this.repository.planHasItems(created.planId));
			if (!inUse) await this.repository.deletePlan(created.planId);
		}
		return {
			payments: payments.length,
			monthItems: created.monthItemIds.length,
		};
	}

	async assertMonthItemOwned(userId: string, id: string) {
		await this.findMonthItem(userId, id).catch(() => {
			throw unprocessable("UNKNOWN_MONTH_ITEM", "Item do mês inexistente");
		});
	}
}
