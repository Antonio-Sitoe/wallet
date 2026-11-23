import { z } from "zod";

import { cents, hexColor, id, positiveCents, yearMonth } from "./common";

const name = z.string().trim().min(1).max(80);
const description = z.string().trim().max(500).nullable();

export const createGoalInput = z.object({
	name,
	description: description.optional(),
	target: positiveCents,
	startingAmount: cents.nonnegative().default(0),
	accountId: id,
	deadline: yearMonth.nullable().optional(),
	color: hexColor.nullable().optional(),
	monthlyContribution: positiveCents.nullable().optional(),
	addToPlan: z.boolean().default(false),
});
export type CreateGoalInput = z.infer<typeof createGoalInput>;

export const updateGoalInput = z
	.object({
		name,
		description,
		target: positiveCents,
		startingAmount: cents.nonnegative(),
		accountId: id,
		deadline: yearMonth.nullable(),
		color: hexColor.nullable(),
		archived: z.boolean(),
	})
	.partial();
export type UpdateGoalInput = z.infer<typeof updateGoalInput>;

export const contributeGoalInput = z.object({
	fromAccountId: id,
	amount: positiveCents,
	occurredAt: z.coerce.date().optional(),
	note: z.string().trim().max(500).nullable().optional(),
});
export type ContributeGoalInput = z.infer<typeof contributeGoalInput>;

export const createGoalPartInput = z.object({
	name,
	amount: positiveCents,
	paid: z.boolean().default(false),
});
export type CreateGoalPartInput = z.infer<typeof createGoalPartInput>;

export const updateGoalPartInput = z
	.object({ name, amount: positiveCents, paid: z.boolean() })
	.partial();
export type UpdateGoalPartInput = z.infer<typeof updateGoalPartInput>;

export const listGoalsQuery = z.object({
	includeArchived: z.stringbool().default(false),
});

export type GoalPart = {
	id: string;
	name: string;
	amount: number;
	paid: boolean;
};

export type GoalPlanLink = {
	id: string;
	name: string;
	amount: number;
	frequency: "monthly" | "months" | "once";
	months: number[];
};

export type Goal = {
	id: string;
	name: string;
	description: string | null;
	color: string | null;
	target: number;
	startingAmount: number;
	saved: number;
	accountId: string;
	deadline: string | null;
	archived: boolean;
	plan: GoalPlanLink | null;
	parts: GoalPart[];
	contributionCount: number;
	lastContributionAt: string | null;
};

export type GoalContribution = {
	transferId: string;
	occurredAt: string;
	fromAccountId: string;
	amount: number;
	note: string | null;
	viaMonthItem: boolean;
};

export type GoalDetail = Goal & { contributions: GoalContribution[] };
