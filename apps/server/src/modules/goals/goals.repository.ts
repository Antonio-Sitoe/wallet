import type { Database } from "@wallet/db";
import { monthItems, planItems } from "@wallet/db/schema/budgets";
import { goalParts, goals } from "@wallet/db/schema/goals";
import { transactions, transfers } from "@wallet/db/schema/transactions";
import { and, asc, desc, eq, inArray, lt, or } from "drizzle-orm";

import type { UpdateGoalInput, UpdateGoalPartInput } from "./goals.schema";
import type {
	ContributionRow,
	GoalPartRow,
	GoalRow,
	NewGoalPartRow,
	NewGoalRow,
	PlanLinkRow,
} from "./goals.types";

const ownedGoal = (userId: string, id: string) =>
	and(eq(goals.userId, userId), eq(goals.id, id));

const ownedPart = (userId: string, id: string) =>
	and(eq(goalParts.userId, userId), eq(goalParts.id, id));

export class GoalsRepository {
	constructor(private readonly db: Database) {}

	list(userId: string, includeArchived: boolean): Promise<GoalRow[]> {
		return this.db
			.select()
			.from(goals)
			.where(
				and(
					eq(goals.userId, userId),
					includeArchived ? undefined : eq(goals.archived, false),
				),
			)
			.orderBy(asc(goals.sortOrder), asc(goals.createdAt));
	}

	async findById(userId: string, id: string): Promise<GoalRow | undefined> {
		const [row] = await this.db
			.select()
			.from(goals)
			.where(ownedGoal(userId, id));
		return row;
	}

	async insert(row: NewGoalRow): Promise<GoalRow> {
		const [created] = await this.db.insert(goals).values(row).returning();
		return created!;
	}

	async update(userId: string, id: string, input: UpdateGoalInput) {
		await this.db.update(goals).set(input).where(ownedGoal(userId, id));
	}

	async delete(userId: string, id: string) {
		await this.db.delete(goals).where(ownedGoal(userId, id));
	}

	async countGoals(userId: string) {
		return this.db.$count(goals, eq(goals.userId, userId));
	}

	partsFor(goalIds: string[]): Promise<GoalPartRow[]> {
		if (goalIds.length === 0) return Promise.resolve([]);
		return this.db
			.select()
			.from(goalParts)
			.where(inArray(goalParts.goalId, goalIds))
			.orderBy(asc(goalParts.sortOrder), asc(goalParts.createdAt));
	}

	async findPart(userId: string, id: string): Promise<GoalPartRow | undefined> {
		const [row] = await this.db
			.select()
			.from(goalParts)
			.where(ownedPart(userId, id));
		return row;
	}

	async insertPart(row: NewGoalPartRow) {
		await this.db.insert(goalParts).values(row);
	}

	async updatePart(userId: string, id: string, input: UpdateGoalPartInput) {
		await this.db.update(goalParts).set(input).where(ownedPart(userId, id));
	}

	async deletePart(userId: string, id: string) {
		await this.db.delete(goalParts).where(ownedPart(userId, id));
	}

	async countParts(goalId: string) {
		return this.db.$count(goalParts, eq(goalParts.goalId, goalId));
	}

	async planLinks(planItemIds: string[]): Promise<PlanLinkRow[]> {
		if (planItemIds.length === 0) return [];
		return this.db
			.select({
				id: planItems.id,
				name: planItems.name,
				amount: planItems.amount,
				frequency: planItems.frequency,
				months: planItems.months,
			})
			.from(planItems)
			.where(inArray(planItems.id, planItemIds));
	}

	async monthItemFor(userId: string, planItemId: string, month: string) {
		const [row] = await this.db
			.select({ id: monthItems.id })
			.from(monthItems)
			.where(
				and(
					eq(monthItems.userId, userId),
					eq(monthItems.planItemId, planItemId),
					eq(monthItems.month, month),
				),
			);
		return row?.id;
	}

	contributions(
		userId: string,
		goal: { id: string; planItemId: string | null },
	): Promise<ContributionRow[]> {
		return this.db
			.select({
				transferId: transfers.id,
				occurredAt: transfers.occurredAt,
				fromAccountId: transfers.fromAccountId,
				amount: transfers.amount,
				note: transactions.note,
				goalId: transfers.goalId,
			})
			.from(transfers)
			.innerJoin(
				transactions,
				and(
					eq(transactions.transferId, transfers.id),
					lt(transactions.amount, 0),
				),
			)
			.leftJoin(monthItems, eq(monthItems.id, transactions.monthItemId))
			.where(
				and(
					eq(transfers.userId, userId),
					or(
						eq(transfers.goalId, goal.id),
						goal.planItemId
							? eq(monthItems.planItemId, goal.planItemId)
							: undefined,
					),
				),
			)
			.orderBy(desc(transfers.occurredAt))
			.then((rows) =>
				rows.map(({ goalId, ...row }) => ({
					...row,
					viaMonthItem: goalId !== goal.id,
				})),
			);
	}
}
