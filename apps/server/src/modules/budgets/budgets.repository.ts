import type { Database } from "@wallet/db";
import { budgetPlans, monthItems, planItems } from "@wallet/db/schema/budgets";
import { and, asc, count, eq, gte, inArray, isNotNull } from "drizzle-orm";

import type {
	UpdateMonthItemInput,
	UpdatePlanItemInput,
} from "./budgets.schema";
import type {
	IBudgetsRepository,
	NewMonthItemRow,
	NewPlanItemRow,
	NewPlanRow,
} from "./budgets.types";

export class BudgetsRepository implements IBudgetsRepository {
	constructor(private readonly db: Database) {}

	async findPlan(userId: string, year: number) {
		const [row] = await this.db
			.select()
			.from(budgetPlans)
			.where(and(eq(budgetPlans.userId, userId), eq(budgetPlans.year, year)));
		return row;
	}

	listPlans(userId: string) {
		return this.db
			.select()
			.from(budgetPlans)
			.where(eq(budgetPlans.userId, userId))
			.orderBy(asc(budgetPlans.year));
	}

	async insertPlan(row: NewPlanRow) {
		const [created] = await this.db.insert(budgetPlans).values(row).returning();
		return created!;
	}

	async updatePlan(planId: string, set: { expectedIncome: number }) {
		await this.db
			.update(budgetPlans)
			.set(set)
			.where(eq(budgetPlans.id, planId));
	}

	async deletePlan(planId: string) {
		await this.db.delete(budgetPlans).where(eq(budgetPlans.id, planId));
	}

	async planHasItems(planId: string) {
		const [row] = await this.db
			.select({ id: planItems.id })
			.from(planItems)
			.where(eq(planItems.planId, planId))
			.limit(1);
		return !!row;
	}

	async findPlanItem(userId: string, id: string) {
		const [row] = await this.db
			.select({ item: planItems, plan: budgetPlans })
			.from(planItems)
			.innerJoin(budgetPlans, eq(planItems.planId, budgetPlans.id))
			.where(and(eq(planItems.userId, userId), eq(planItems.id, id)));
		return row;
	}

	listPlanItems(planId: string) {
		return this.db
			.select()
			.from(planItems)
			.where(eq(planItems.planId, planId))
			.orderBy(asc(planItems.sortOrder), asc(planItems.createdAt));
	}

	async countPlanItems(planId: string) {
		const [row] = await this.db
			.select({ n: count() })
			.from(planItems)
			.where(eq(planItems.planId, planId));
		return row?.n ?? 0;
	}

	async insertPlanItem(row: NewPlanItemRow) {
		const [created] = await this.db.insert(planItems).values(row).returning();
		return created!;
	}

	async insertPlanItems(rows: NewPlanItemRow[]) {
		if (rows.length > 0) await this.db.insert(planItems).values(rows);
	}

	async updatePlanItem(
		id: string,
		changes: Omit<UpdatePlanItemInput, "applyFrom">,
	) {
		const [updated] = await this.db
			.update(planItems)
			.set(changes)
			.where(eq(planItems.id, id))
			.returning();
		return updated!;
	}

	async deletePlanItem(id: string) {
		await this.db.delete(planItems).where(eq(planItems.id, id));
	}

	async deletePlanItems(userId: string, ids: string[]) {
		if (ids.length === 0) return;
		await this.db
			.delete(planItems)
			.where(and(eq(planItems.userId, userId), inArray(planItems.id, ids)));
	}

	async findMonthItem(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(monthItems)
			.where(and(eq(monthItems.userId, userId), eq(monthItems.id, id)));
		return row;
	}

	listMonthItems(userId: string, months: string[]) {
		return this.db
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

	async monthItemIdsOfPlan(planId: string) {
		const rows = await this.db
			.select({ id: monthItems.id })
			.from(monthItems)
			.where(eq(monthItems.planId, planId));
		return rows.map((r) => r.id);
	}

	async planIsGenerated(planId: string) {
		const [row] = await this.db
			.select({ id: monthItems.id })
			.from(monthItems)
			.where(
				and(eq(monthItems.planId, planId), isNotNull(monthItems.planItemId)),
			)
			.limit(1);
		return !!row;
	}

	async planHasMonthItems(planId: string) {
		const [row] = await this.db
			.select({ id: monthItems.id })
			.from(monthItems)
			.where(eq(monthItems.planId, planId))
			.limit(1);
		return !!row;
	}

	existingMonths(planItemIds: string[]) {
		return this.db
			.select({ planItemId: monthItems.planItemId, month: monthItems.month })
			.from(monthItems)
			.where(inArray(monthItems.planItemId, planItemIds));
	}

	async siblingsOf(userId: string, planItemIds: string[]) {
		if (planItemIds.length === 0) return [];
		return this.db
			.select({ id: monthItems.id, planItemId: monthItems.planItemId })
			.from(monthItems)
			.where(
				and(
					eq(monthItems.userId, userId),
					inArray(monthItems.planItemId, planItemIds),
				),
			);
	}

	monthItemsFrom(planItemId: string, fromMonth: string) {
		return this.db
			.select()
			.from(monthItems)
			.where(
				and(
					eq(monthItems.planItemId, planItemId),
					gte(monthItems.month, fromMonth),
				),
			);
	}

	async insertMonthItem(row: NewMonthItemRow) {
		const [created] = await this.db.insert(monthItems).values(row).returning();
		return created!;
	}

	async insertMonthItems(rows: NewMonthItemRow[]) {
		if (rows.length > 0)
			await this.db.insert(monthItems).values(rows).onConflictDoNothing();
	}

	async updateMonthItem(
		id: string,
		set: UpdateMonthItemInput | Partial<NewMonthItemRow>,
	) {
		await this.db.update(monthItems).set(set).where(eq(monthItems.id, id));
	}

	async deleteMonthItems(userId: string, ids: string[]) {
		if (ids.length === 0) return;
		await this.db
			.delete(monthItems)
			.where(and(eq(monthItems.userId, userId), inArray(monthItems.id, ids)));
	}
}
