import type {
	budgetPlans,
	monthItems,
	planItems,
} from "@wallet/db/schema/budgets";

import type {
	CreateTransactionInput,
	CreateTransferInput,
	UpdateMonthItemInput,
	UpdatePlanItemInput,
} from "./budgets.schema";

export type PlanRow = typeof budgetPlans.$inferSelect;
export type NewPlanRow = typeof budgetPlans.$inferInsert;
export type PlanItemRow = typeof planItems.$inferSelect;
export type NewPlanItemRow = typeof planItems.$inferInsert;
export type MonthItemRow = typeof monthItems.$inferSelect;
export type NewMonthItemRow = typeof monthItems.$inferInsert;

export type LinkedPayment = {
	transactionId: string;
	monthItemId: string;
	transferId: string | null;
	accountId: string;
	amount: number;
	occurredAt: Date;
	note: string | null;
};

export type BudgetsDeps = {
	accounts: { assertOwned(userId: string, ids: string[]): Promise<void> };
	categories: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
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

export interface IBudgetsRepository {
	findPlan(userId: string, year: number): Promise<PlanRow | undefined>;
	listPlans(userId: string): Promise<PlanRow[]>;
	insertPlan(row: NewPlanRow): Promise<PlanRow>;
	updatePlan(planId: string, set: { expectedIncome: number }): Promise<void>;
	deletePlan(planId: string): Promise<void>;
	planHasItems(planId: string): Promise<boolean>;

	findPlanItem(
		userId: string,
		id: string,
	): Promise<{ item: PlanItemRow; plan: PlanRow } | undefined>;
	listPlanItems(planId: string): Promise<PlanItemRow[]>;
	countPlanItems(planId: string): Promise<number>;
	insertPlanItem(row: NewPlanItemRow): Promise<PlanItemRow>;
	insertPlanItems(rows: NewPlanItemRow[]): Promise<void>;
	updatePlanItem(
		id: string,
		changes: Omit<UpdatePlanItemInput, "applyFrom">,
	): Promise<PlanItemRow>;
	deletePlanItem(id: string): Promise<void>;
	deletePlanItems(userId: string, ids: string[]): Promise<void>;

	findMonthItem(userId: string, id: string): Promise<MonthItemRow | undefined>;
	listMonthItems(userId: string, months: string[]): Promise<MonthItemRow[]>;
	monthItemIdsOfPlan(planId: string): Promise<string[]>;
	planIsGenerated(planId: string): Promise<boolean>;
	planHasMonthItems(planId: string): Promise<boolean>;
	existingMonths(
		planItemIds: string[],
	): Promise<{ planItemId: string | null; month: string }[]>;
	siblingsOf(
		userId: string,
		planItemIds: string[],
	): Promise<{ id: string; planItemId: string | null }[]>;
	monthItemsFrom(
		planItemId: string,
		fromMonth: string,
	): Promise<MonthItemRow[]>;
	insertMonthItem(row: NewMonthItemRow): Promise<MonthItemRow>;
	insertMonthItems(rows: NewMonthItemRow[]): Promise<void>;
	updateMonthItem(
		id: string,
		set: UpdateMonthItemInput | Partial<NewMonthItemRow>,
	): Promise<void>;
	deleteMonthItems(userId: string, ids: string[]): Promise<void>;
}
