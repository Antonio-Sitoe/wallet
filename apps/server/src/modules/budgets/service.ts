import type { Database } from "@wallet/db";
import { budgetPlans, monthItems, planItems } from "@wallet/db/schema/budgets";
import {
	type CreateMonthItemInput,
	type CreatePlanInput,
	type CreatePlanItemInput,
	type CreateTransactionInput,
	type CreateTransferInput,
	formatYearMonth,
	type MonthBudget,
	type MonthItem,
	type PayMonthItemInput,
	type Plan,
	type PlanItem,
	type PlanItemYear,
	parseYearMonth,
	type UpdateMonthItemInput,
	type UpdatePlanItemInput,
	yearMonthOf,
} from "@wallet/shared";
import { and, asc, eq, gte, inArray, isNotNull } from "drizzle-orm";

import { conflict, notFound, unprocessable } from "../../lib/errors";
import { isUniqueViolation } from "../../lib/pg";
import {
	ALL_MONTHS,
	attributeSpending,
	itemStatus,
	monthsFor,
	pace,
} from "./compute";

type LinkedPayment = {
	transactionId: string;
	monthItemId: string;
	transferId: string | null;
	accountId: string;
	amount: number;
	occurredAt: Date;
	note: string | null;
};

/** What the budget needs from the other modules. */
export type BudgetsDeps = {
	accounts: { assertOwned(userId: string, ids: string[]): Promise<void> };
	categories: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
		/** category id → parent id (null for a top-level category). */
		parentMap(userId: string): Promise<Map<string, string | null>>;
	};
	transactions: {
		linkedPayments(
			userId: string,
			monthItemIds: string[],
		): Promise<LinkedPayment[]>;
		monthActivity(
			userId: string,
			months: string[],
		): Promise<{
			unlinkedOut: {
				month: string;
				categoryId: string | null;
				type: "expense" | "income" | "transfer";
				spent: number;
			}[];
			income: Map<string, number>;
		}>;
		create(userId: string, input: CreateTransactionInput): Promise<unknown>;
		createTransfer(
			userId: string,
			input: CreateTransferInput,
		): Promise<unknown>;
		remove(userId: string, id: string): Promise<void>;
	};
};

type PlanRow = typeof budgetPlans.$inferSelect;
type PlanItemRow = typeof planItems.$inferSelect;
type MonthItemRow = typeof monthItems.$inferSelect;

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

/** The month-item fields a plan item hands down to each month. */
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

export function createBudgetsService(db: Database, deps: BudgetsDeps) {
	async function findPlan(userId: string, year: number) {
		const [row] = await db
			.select()
			.from(budgetPlans)
			.where(and(eq(budgetPlans.userId, userId), eq(budgetPlans.year, year)));
		if (!row) throw notFound(`Plano de ${year}`);
		return row;
	}

	async function findPlanItem(userId: string, id: string) {
		const [row] = await db
			.select({ item: planItems, plan: budgetPlans })
			.from(planItems)
			.innerJoin(budgetPlans, eq(planItems.planId, budgetPlans.id))
			.where(and(eq(planItems.userId, userId), eq(planItems.id, id)));
		if (!row) throw notFound("Item do plano");
		return row;
	}

	async function findMonthItem(userId: string, id: string) {
		const [row] = await db
			.select()
			.from(monthItems)
			.where(and(eq(monthItems.userId, userId), eq(monthItems.id, id)));
		if (!row) throw notFound("Item do mês");
		return row;
	}

	async function assertRefs(
		userId: string,
		refs: {
			categoryId?: string | null;
			accountId?: string | null;
			toAccountId?: string | null;
		},
	) {
		if (refs.categoryId)
			await deps.categories.assertOwned(userId, [refs.categoryId]);
		const accounts = [refs.accountId, refs.toAccountId].filter(
			(v): v is string => !!v,
		);
		await deps.accounts.assertOwned(userId, accounts);
		if (refs.accountId && refs.accountId === refs.toAccountId) {
			throw unprocessable(
				"SAME_ACCOUNT",
				"A conta de origem e a de destino têm de ser diferentes",
			);
		}
	}

	async function isGenerated(planId: string) {
		const [row] = await db
			.select({ id: monthItems.id })
			.from(monthItems)
			.where(
				and(eq(monthItems.planId, planId), isNotNull(monthItems.planItemId)),
			)
			.limit(1);
		return !!row;
	}

	/** Month items that have at least one payment from the list. */
	async function paidIds(userId: string, ids: string[]) {
		const payments = await deps.transactions.linkedPayments(userId, ids);
		return new Set(payments.map((p) => p.monthItemId));
	}

	/** Creates the month items of `items` for `months` that do not exist yet. */
	async function materialize(
		userId: string,
		plan: PlanRow,
		items: PlanItemRow[],
		fromMonth?: string,
	) {
		if (items.length === 0) return 0;
		const existing = await db
			.select({ planItemId: monthItems.planItemId, month: monthItems.month })
			.from(monthItems)
			.where(
				inArray(
					monthItems.planItemId,
					items.map((i) => i.id),
				),
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
		if (values.length > 0)
			await db.insert(monthItems).values(values).onConflictDoNothing();
		return values.length;
	}

	/** Computes spent / status / payments for month items. */
	async function viewMonthItems(
		userId: string,
		rows: MonthItemRow[],
		months: string[],
	) {
		const planItemIds = [
			...new Set(rows.map((r) => r.planItemId).filter((v): v is string => !!v)),
		];
		// Siblings in every month, so "last account used for this item" looks across months.
		const siblings = planItemIds.length
			? await db
					.select({ id: monthItems.id, planItemId: monthItems.planItemId })
					.from(monthItems)
					.where(
						and(
							eq(monthItems.userId, userId),
							inArray(monthItems.planItemId, planItemIds),
						),
					)
			: [];
		const allIds = [
			...new Set([...rows.map((r) => r.id), ...siblings.map((s) => s.id)]),
		];
		const [payments, activity, parents] = await Promise.all([
			deps.transactions.linkedPayments(userId, allIds),
			deps.transactions.monthActivity(userId, months),
			deps.categories.parentMap(userId),
		]);
		const { matched, unassigned } = attributeSpending(
			rows,
			activity.unlinkedOut,
			parents,
		);

		const planItemOf = new Map(siblings.map((s) => [s.id, s.planItemId]));
		const lastAccount = new Map<string, string>();
		for (const p of payments) {
			const key = planItemOf.get(p.monthItemId) ?? p.monthItemId;
			if (!lastAccount.has(key)) lastAccount.set(key, p.accountId); // payments are newest first
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

	async function monthRows(userId: string, months: string[]) {
		return db
			.select()
			.from(monthItems)
			.where(
				and(eq(monthItems.userId, userId), inArray(monthItems.month, months)),
			)
			.orderBy(
				asc(monthItems.month),
				asc(monthItems.unplanned),
				asc(monthItems.sortOrder),
				asc(monthItems.createdAt),
			);
	}

	const service = {
		// ---- Plans ----

		async listPlans(userId: string) {
			const rows = await db
				.select()
				.from(budgetPlans)
				.where(eq(budgetPlans.userId, userId))
				.orderBy(asc(budgetPlans.year));
			return Promise.all(
				rows.map(async (p) => ({
					id: p.id,
					year: p.year,
					expectedIncome: p.expectedIncome,
					generated: await isGenerated(p.id),
				})),
			);
		},

		async createPlan(userId: string, input: CreatePlanInput) {
			let plan: PlanRow;
			try {
				[plan] = (await db
					.insert(budgetPlans)
					.values({
						userId,
						year: input.year,
						expectedIncome: input.expectedIncome,
					})
					.returning()) as [PlanRow];
			} catch (error) {
				if (isUniqueViolation(error))
					throw conflict(
						"PLAN_EXISTS",
						`Já existe um plano para ${input.year}`,
					);
				throw error;
			}
			if (input.copyFrom !== undefined) {
				const source = await findPlan(userId, input.copyFrom);
				const items = await db
					.select()
					.from(planItems)
					.where(eq(planItems.planId, source.id))
					.orderBy(asc(planItems.sortOrder));
				const copied = items.filter(
					(i) =>
						i.frequency === "monthly" ||
						(i.frequency === "months" && input.copySeasonal) ||
						(i.frequency === "once" && input.copyOneOff),
				);
				if (copied.length > 0) {
					await db.insert(planItems).values(
						copied.map(
							({
								id: _id,
								planId: _p,
								createdAt: _c,
								updatedAt: _u,
								...rest
							}) => ({
								...rest,
								planId: plan.id,
							}),
						),
					);
				}
				if (input.expectedIncome === 0) {
					await db
						.update(budgetPlans)
						.set({ expectedIncome: source.expectedIncome })
						.where(eq(budgetPlans.id, plan.id));
				}
			}
			return service.getPlan(userId, input.year);
		},

		async updatePlan(
			userId: string,
			year: number,
			input: { expectedIncome: number },
		) {
			const plan = await findPlan(userId, year);
			await db
				.update(budgetPlans)
				.set(input)
				.where(eq(budgetPlans.id, plan.id));
			return service.getPlan(userId, year);
		},

		async deletePlan(userId: string, year: number) {
			const plan = await findPlan(userId, year);
			const ids = (
				await db
					.select({ id: monthItems.id })
					.from(monthItems)
					.where(eq(monthItems.planId, plan.id))
			).map((r) => r.id);
			if ((await paidIds(userId, ids)).size > 0) {
				throw conflict(
					"PLAN_HAS_PAYMENTS",
					"O plano tem itens pagos; desmarque-os primeiro ou edite os itens em vez de apagar o plano",
				);
			}
			await db.delete(budgetPlans).where(eq(budgetPlans.id, plan.id));
		},

		/** The yearly view: every item with its months, projected vs spent to date and pace. */
		async getPlan(
			userId: string,
			year: number,
			asOf = currentMonth(),
		): Promise<Plan> {
			const plan = await findPlan(userId, year);
			const items = await db
				.select()
				.from(planItems)
				.where(eq(planItems.planId, plan.id))
				.orderBy(asc(planItems.sortOrder), asc(planItems.createdAt));
			const months = monthsOfYear(year);
			const rows = (await monthRows(userId, months)).filter(
				(r) => r.planId === plan.id,
			);
			const { items: views } = await viewMonthItems(userId, rows, months);
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
		},

		/** Creates the month lists of the whole year from the plan. Existing month items are left alone. */
		async generate(userId: string, year: number) {
			const plan = await findPlan(userId, year);
			const items = await db
				.select()
				.from(planItems)
				.where(eq(planItems.planId, plan.id));
			const created = await materialize(userId, plan, items);
			return { created, plan: await service.getPlan(userId, year) };
		},

		// ---- Plan items ----

		async addPlanItem(
			userId: string,
			year: number,
			input: CreatePlanItemInput,
		) {
			const plan = await findPlan(userId, year);
			await assertRefs(userId, input);
			const siblings = await db
				.select({ id: planItems.id })
				.from(planItems)
				.where(eq(planItems.planId, plan.id));
			const [item] = await db
				.insert(planItems)
				.values({
					userId,
					planId: plan.id,
					...input,
					sortOrder: siblings.length,
				})
				.returning();
			// Once the lists exist, a new item joins them from this month on.
			if (await isGenerated(plan.id))
				await materialize(userId, plan, [item!], currentMonth());
			return toPlanItem(item!);
		},

		/**
		 * Changes apply from `applyFrom` (default: this month) onwards: months not yet paid follow the new values,
		 * earlier months and months with payments keep theirs.
		 */
		async updatePlanItem(
			userId: string,
			id: string,
			input: UpdatePlanItemInput,
		) {
			const { item, plan } = await findPlanItem(userId, id);
			const { applyFrom = currentMonth(), ...changes } = input;
			await assertRefs(userId, {
				categoryId: changes.categoryId,
				accountId: changes.accountId ?? item.accountId,
				toAccountId: changes.toAccountId ?? item.toAccountId,
			});
			const [updated] = await db
				.update(planItems)
				.set(changes)
				.where(eq(planItems.id, id))
				.returning();
			const next = updated!;
			if (!(await isGenerated(plan.id))) return toPlanItem(next);

			const future = await db
				.select()
				.from(monthItems)
				.where(
					and(eq(monthItems.planItemId, id), gte(monthItems.month, applyFrom)),
				);
			const paid = await paidIds(
				userId,
				future.map((f) => f.id),
			);
			const applies = new Set(
				monthsFor(next).map((m) => formatYearMonth(plan.year, m)),
			);
			for (const row of future) {
				if (paid.has(row.id)) continue;
				if (applies.has(row.month)) {
					await db
						.update(monthItems)
						.set(fromPlanItem(next))
						.where(eq(monthItems.id, row.id));
				} else {
					await db.delete(monthItems).where(eq(monthItems.id, row.id));
				}
			}
			await materialize(userId, plan, [next], applyFrom);
			return toPlanItem(next);
		},

		/** Removes the item from the plan and from unpaid months from `applyFrom`; paid months keep their line. */
		async deletePlanItem(
			userId: string,
			id: string,
			applyFrom = currentMonth(),
		) {
			await findPlanItem(userId, id);
			const future = await db
				.select({ id: monthItems.id })
				.from(monthItems)
				.where(
					and(eq(monthItems.planItemId, id), gte(monthItems.month, applyFrom)),
				);
			const paid = await paidIds(
				userId,
				future.map((f) => f.id),
			);
			const removable = future.map((f) => f.id).filter((fid) => !paid.has(fid));
			if (removable.length > 0)
				await db.delete(monthItems).where(inArray(monthItems.id, removable));
			await db.delete(planItems).where(eq(planItems.id, id));
		},

		// ---- Month lists ----

		async getMonth(userId: string, month: string): Promise<MonthBudget> {
			const { year } = parseYearMonth(month);
			const [plan] = await db
				.select()
				.from(budgetPlans)
				.where(and(eq(budgetPlans.userId, userId), eq(budgetPlans.year, year)));
			const rows = await monthRows(userId, [month]);
			const { items, unassigned, income } = await viewMonthItems(userId, rows, [
				month,
			]);
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
		},

		async getMonthItem(userId: string, id: string) {
			const row = await findMonthItem(userId, id);
			const { items } = await viewMonthItems(userId, [row], [row.month]);
			return items[0]!;
		},

		/** "Não planeado": a line added straight to one month. */
		async addMonthItem(
			userId: string,
			month: string,
			input: CreateMonthItemInput,
		) {
			await assertRefs(userId, input);
			const { year } = parseYearMonth(month);
			const [plan] = await db
				.select({ id: budgetPlans.id })
				.from(budgetPlans)
				.where(and(eq(budgetPlans.userId, userId), eq(budgetPlans.year, year)));
			const { amount, ...rest } = input;
			const [row] = await db
				.insert(monthItems)
				.values({
					userId,
					planId: plan?.id ?? null,
					month,
					...rest,
					plannedAmount: amount,
					unplanned: true,
					sortOrder: 1000,
				})
				.returning();
			return service.getMonthItem(userId, row!.id);
		},

		/** Edits one month only; the plan stays as it is. */
		async updateMonthItem(
			userId: string,
			id: string,
			input: UpdateMonthItemInput,
		) {
			const row = await findMonthItem(userId, id);
			await assertRefs(userId, {
				categoryId: input.categoryId,
				accountId: input.accountId ?? row.accountId,
				toAccountId: input.toAccountId ?? row.toAccountId,
			});
			await db.update(monthItems).set(input).where(eq(monthItems.id, id));
			return service.getMonthItem(userId, id);
		},

		async deleteMonthItem(userId: string, id: string) {
			await findMonthItem(userId, id);
			if ((await paidIds(userId, [id])).size > 0) {
				throw conflict(
					"MONTH_ITEM_HAS_PAYMENTS",
					"Desmarque o item (apaga os pagamentos) antes de o remover",
				);
			}
			await db.delete(monthItems).where(eq(monthItems.id, id));
		},

		/** Check: records a payment. A savings item (with a destination account) is paid by a transfer. */
		async pay(userId: string, id: string, input: PayMonthItemInput) {
			const item = await service.getMonthItem(userId, id);
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
				await deps.transactions.createTransfer(userId, {
					fromAccountId: accountId,
					toAccountId: item.toAccountId,
					amount,
					occurredAt,
					referenceMonth: item.month,
					note,
					monthItemId: id,
				});
			} else {
				await deps.transactions.create(userId, {
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
			return service.getMonthItem(userId, id);
		},

		/** Uncheck: deletes every payment made from the list for this item. */
		async unpay(userId: string, id: string) {
			const item = await service.getMonthItem(userId, id);
			for (const p of item.payments)
				await deps.transactions.remove(userId, p.transactionId);
			return service.getMonthItem(userId, id);
		},

		async removePayment(userId: string, id: string, transactionId: string) {
			const item = await service.getMonthItem(userId, id);
			if (!item.payments.some((p) => p.transactionId === transactionId)) {
				throw notFound("Pagamento deste item");
			}
			await deps.transactions.remove(userId, transactionId);
			return service.getMonthItem(userId, id);
		},

		// ---- Used by other modules ----

		async assertMonthItemOwned(userId: string, id: string) {
			await findMonthItem(userId, id).catch(() => {
				throw unprocessable("UNKNOWN_MONTH_ITEM", "Item do mês inexistente");
			});
		},
	};
	return service;
}

export type BudgetsService = ReturnType<typeof createBudgetsService>;
