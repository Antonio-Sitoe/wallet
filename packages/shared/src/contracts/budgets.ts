import { z } from "zod";

import { cents, id, positiveCents, yearMonth } from "./common";

/** How the design groups a month's list. */
export const BUDGET_GROUPS = [
	"fixed",
	"savings",
	"variable",
	"oneoff",
] as const;
export type BudgetGroup = (typeof BUDGET_GROUPS)[number];

/** monthly: every month · months: the listed months · once: exactly one month. */
export const FREQUENCIES = ["monthly", "months", "once"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const year = z.coerce.number().int().min(2000).max(2100);
export const yearParams = z.object({ year });
export const monthParams = z.object({ month: yearMonth });
export const paymentParams = z.object({ id, transactionId: id });

const monthNumbers = z.array(z.number().int().min(1).max(12)).max(12);

const frequencyRule = (
	v: { frequency?: Frequency; months?: number[] },
	ctx: z.core.$RefinementCtx,
) => {
	if (v.frequency === "months" && (!v.months || v.months.length === 0)) {
		ctx.addIssue({
			code: "custom",
			path: ["months"],
			message: "Escolha pelo menos um mês",
		});
	}
	if (v.frequency === "once" && v.months?.length !== 1) {
		ctx.addIssue({
			code: "custom",
			path: ["months"],
			message: "Um item de uma vez tem exactamente um mês",
		});
	}
};

export const createPlanInput = z.object({
	year: z.number().int().min(2000).max(2100),
	/** Expected monthly salary, centavos. */
	expectedIncome: cents.min(0).default(0),
	/** Copy the items of another year's plan. */
	copyFrom: z.number().int().min(2000).max(2100).optional(),
	/** When copying: also copy one-off and seasonal items (design defaults: no / yes). */
	copyOneOff: z.boolean().default(false),
	copySeasonal: z.boolean().default(true),
});
export type CreatePlanInput = z.infer<typeof createPlanInput>;

export const updatePlanInput = z.object({ expectedIncome: cents.min(0) });

const planItemFields = {
	name: z.string().trim().min(1).max(80),
	group: z.enum(BUDGET_GROUPS),
	categoryId: id.nullable(),
	/** Planned amount per month it applies to, centavos. */
	amount: positiveCents,
	frequency: z.enum(FREQUENCIES),
	months: monthNumbers,
	/** Account the money leaves from by default. */
	accountId: id.nullable(),
	/** Set for savings: paying the item is a transfer into this account. */
	toAccountId: id.nullable(),
	/** Spent bit by bit (Transporte, Alimentação). */
	partial: z.boolean(),
	/** Quick-entry amount for partial items (100 for a ride). */
	step: positiveCents.nullable(),
};

export const createPlanItemInput = z
	.object({
		...planItemFields,
		categoryId: planItemFields.categoryId.default(null),
		months: planItemFields.months.default([]),
		accountId: planItemFields.accountId.default(null),
		toAccountId: planItemFields.toAccountId.default(null),
		partial: planItemFields.partial.default(false),
		step: planItemFields.step.default(null),
		frequency: planItemFields.frequency.default("monthly"),
		group: planItemFields.group.default("fixed"),
	})
	.superRefine(frequencyRule);
export type CreatePlanItemInput = z.infer<typeof createPlanItemInput>;

export const updatePlanItemInput = z
	.object({
		...planItemFields,
		/** Months before this one keep their values (default: the current month). */
		applyFrom: yearMonth,
	})
	.partial()
	.superRefine(frequencyRule);
export type UpdatePlanItemInput = z.infer<typeof updatePlanItemInput>;

export const deletePlanItemQuery = z.object({
	applyFrom: yearMonth.optional(),
});

export const createMonthItemInput = z.object({
	name: z.string().trim().min(1).max(80),
	group: z.enum(BUDGET_GROUPS).default("oneoff"),
	categoryId: id.nullable().default(null),
	amount: positiveCents,
	accountId: id.nullable().default(null),
	toAccountId: id.nullable().default(null),
	partial: z.boolean().default(false),
	step: positiveCents.nullable().default(null),
});
export type CreateMonthItemInput = z.infer<typeof createMonthItemInput>;

export const updateMonthItemInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		group: z.enum(BUDGET_GROUPS),
		categoryId: id.nullable(),
		plannedAmount: positiveCents,
		accountId: id.nullable(),
		toAccountId: id.nullable(),
		partial: z.boolean(),
		step: positiveCents.nullable(),
	})
	.partial();
export type UpdateMonthItemInput = z.infer<typeof updateMonthItemInput>;

/** "Check": record a payment of the item. Everything is pre-filled from the item. */
export const payMonthItemInput = z.object({
	/** Defaults to the step (partial items) or what is still missing. */
	amount: positiveCents.optional(),
	/** Defaults to the account last used for this item, then the item's account. */
	accountId: id.optional(),
	occurredAt: z.coerce.date().optional(),
	note: z.string().trim().max(500).nullable().optional(),
});
export type PayMonthItemInput = z.infer<typeof payMonthItemInput>;

export const planViewQuery = z.object({
	/** "Today" for the pace column; defaults to the current month. */
	asOf: yearMonth.optional(),
});

export type ItemStatus = "unpaid" | "partial" | "paid" | "over";
export type PaceStatus = "within" | "over" | "no_data";

export type PlanItem = {
	id: string;
	name: string;
	group: BudgetGroup;
	categoryId: string | null;
	amount: number;
	frequency: Frequency;
	/** Months (1–12) the item applies to. */
	months: number[];
	accountId: string | null;
	toAccountId: string | null;
	partial: boolean;
	step: number | null;
	sortOrder: number;
};

export type PlanItemYear = PlanItem & {
	/** Planned for the whole year. */
	projected: number;
	/** Planned for the months up to `asOf`. */
	plannedToDate: number;
	spentToDate: number;
	pace: PaceStatus;
	/** Spent ÷ planned to date, as a percentage; null without data. */
	pacePercent: number | null;
	byMonth: {
		month: string;
		planned: number;
		spent: number;
		status: ItemStatus;
	}[];
};

export type Plan = {
	id: string;
	year: number;
	expectedIncome: number;
	/** Whether the monthly lists exist. */
	generated: boolean;
	asOf: string;
	items: PlanItemYear[];
	totals: { year: number; monthlyAverage: number; itemsOverPace: number };
	months: {
		month: string;
		items: number;
		planned: number;
		overIncome: boolean;
	}[];
};

export type Payment = {
	transactionId: string;
	transferId: string | null;
	accountId: string;
	/** Positive centavos paid. */
	amount: number;
	occurredAt: string;
	note: string | null;
};

export type MonthItem = {
	id: string;
	month: string;
	planItemId: string | null;
	name: string;
	group: BudgetGroup;
	categoryId: string | null;
	accountId: string | null;
	toAccountId: string | null;
	/** Pre-selected account when checking: last used for this item, else the item's. */
	defaultAccountId: string | null;
	plannedAmount: number;
	partial: boolean;
	step: number | null;
	unplanned: boolean;
	/** linkedSpent + matchedSpent. */
	spent: number;
	/** Payments made from the list (transactions linked to this item). */
	linkedSpent: number;
	/** Transactions registered elsewhere that matched this item by category. */
	matchedSpent: number;
	remaining: number;
	status: ItemStatus;
	/** A non-partial item counts as ticked once anything is paid. */
	checked: boolean;
	payments: Payment[];
};

export type MonthBudget = {
	month: string;
	planYear: number | null;
	/** False when the month has no list yet (no plan or not generated). */
	hasList: boolean;
	expectedIncome: number;
	/** Income actually received in the month. */
	income: number;
	totals: {
		planned: number;
		spent: number;
		/** What is still to spend on the list. */
		remaining: number;
		unplanned: number;
		/** Expenses of the month that match no item. */
		unassignedSpent: number;
		/** expectedIncome − planned. */
		leftover: number;
	};
	items: MonthItem[];
};
