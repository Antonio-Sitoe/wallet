import type { goalParts, goals } from "@wallet/db/schema/goals";
import type { CreatePlanItemInput, CreateTransferInput } from "@wallet/shared";

export type GoalRow = typeof goals.$inferSelect;
export type NewGoalRow = typeof goals.$inferInsert;
export type GoalPartRow = typeof goalParts.$inferSelect;
export type NewGoalPartRow = typeof goalParts.$inferInsert;

export type PlanLinkRow = {
	id: string;
	name: string;
	amount: number;
	frequency: "monthly" | "months" | "once";
	months: number[];
};

export type ContributionRow = {
	transferId: string;
	occurredAt: Date;
	fromAccountId: string;
	amount: number;
	note: string | null;
	viaMonthItem: boolean;
};

export type GoalsDeps = {
	accounts: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
	transactions: {
		createTransfer(
			userId: string,
			input: CreateTransferInput,
			options: { goalId?: string },
		): Promise<unknown>;
	};
	budgets: {
		addPlanItem(
			userId: string,
			year: number,
			input: CreatePlanItemInput,
		): Promise<{ id: string }>;
	};
};
