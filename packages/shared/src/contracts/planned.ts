import { z } from "zod";

import { PLANNED_FREQUENCIES, type PlannedFrequency } from "../schedule";
import { id, positiveCents } from "./common";

export const PLANNED_KINDS = ["expense", "transfer"] as const;
export type PlannedKind = (typeof PLANNED_KINDS)[number];

export const REMIND_DAYS = [0, 1, 3, 7] as const;

const isoDay = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");

const fields = {
	name: z.string().trim().min(1).max(120),
	kind: z.enum(PLANNED_KINDS),
	amount: positiveCents,
	accountId: id,
	toAccountId: id.nullable(),
	categoryId: id.nullable(),
	frequency: z.enum(PLANNED_FREQUENCIES),
	startDate: isoDay,
	endDate: isoDay.nullable(),
	remindDays: z.number().int().min(0).max(30).nullable(),
	planItemId: id.nullable(),
	note: z.string().trim().max(500).nullable(),
};

const transferRule = (
	v: { kind?: PlannedKind; accountId?: string; toAccountId?: string | null },
	ctx: z.RefinementCtx,
) => {
	if (v.kind === "transfer" && !v.toAccountId)
		ctx.addIssue({
			code: "custom",
			message: "Escolha a conta de destino",
			path: ["toAccountId"],
		});
	if (v.toAccountId && v.toAccountId === v.accountId)
		ctx.addIssue({
			code: "custom",
			message: "A conta de origem e a de destino têm de ser diferentes",
			path: ["toAccountId"],
		});
};

export const createPlannedPaymentInput = z
	.object({
		...fields,
		toAccountId: fields.toAccountId.default(null),
		categoryId: fields.categoryId.default(null),
		frequency: fields.frequency.default("monthly"),
		endDate: fields.endDate.default(null),
		remindDays: fields.remindDays.default(1),
		planItemId: fields.planItemId.default(null),
		note: fields.note.default(null),
	})
	.superRefine(transferRule);
export type CreatePlannedPaymentInput = z.input<
	typeof createPlannedPaymentInput
>;

export const updatePlannedPaymentInput = z
	.object({ ...fields, archived: z.boolean() })
	.partial()
	.superRefine(transferRule);
export type UpdatePlannedPaymentInput = z.infer<
	typeof updatePlannedPaymentInput
>;

export const listPlannedPaymentsQuery = z.object({
	includeArchived: z.stringbool().default(false),
});

export const plannedOccurrencesQuery = z.object({
	from: isoDay.optional(),
	to: isoDay.optional(),
	today: isoDay.optional(),
});

export const plannedRemindersQuery = z.object({ today: isoDay.optional() });

export const confirmPlannedPaymentInput = z.object({
	dueDate: isoDay,
	amount: positiveCents.optional(),
	accountId: id.optional(),
	occurredAt: z.coerce.date().optional(),
});
export type ConfirmPlannedPaymentInput = z.infer<
	typeof confirmPlannedPaymentInput
>;

export const skipPlannedPaymentInput = z.object({ dueDate: isoDay });

export const plannedOccurrenceParams = z.object({ id, dueDate: isoDay });

export type PlannedPayment = {
	id: string;
	name: string;
	kind: PlannedKind;
	amount: number;
	accountId: string | null;
	toAccountId: string | null;
	categoryId: string | null;
	frequency: PlannedFrequency;
	startDate: string;
	endDate: string | null;
	remindDays: number | null;
	planItemId: string | null;
	planItemName: string | null;
	note: string | null;
	archived: boolean;
	createdAt: string;
};

export const OCCURRENCE_STATUSES = [
	"paid",
	"skipped",
	"overdue",
	"due",
	"scheduled",
] as const;
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];

export type PlannedOccurrence = {
	paymentId: string;
	dueDate: string;
	status: OccurrenceStatus;
	daysLate: number;
	name: string;
	kind: PlannedKind;
	amount: number;
	accountId: string | null;
	toAccountId: string | null;
	categoryId: string | null;
	frequency: PlannedFrequency;
	transactionId: string | null;
	transferId: string | null;
	paidAmount: number | null;
	paidAt: string | null;
	paidAccountId: string | null;
	monthItemId: string | null;
};

export type PlannedReminder = {
	key: string;
	paymentId: string;
	dueDate: string;
	title: string;
	body: string;
	overdue: boolean;
};
