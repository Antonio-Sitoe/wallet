import { z } from "zod";

import { id } from "./common";

export const walletImportInput = z.object({
	files: z
		.array(
			z.object({
				name: z.string().trim().min(1).max(200),
				content: z.string().min(1),
			}),
		)
		.min(1)
		.max(10),
});
export type WalletImportInput = z.infer<typeof walletImportInput>;

export const reviewResolution = z.union([
	z.literal("ignore"),
	z.literal("keep"),
	z.object({ transferTo: id }),
]);
export type ReviewResolution = z.infer<typeof reviewResolution>;

export const commitImportInput = z.object({
	categoryMap: z.record(z.string(), id).default({}),
	resolutions: z.record(z.string(), reviewResolution).default({}),
});
export type CommitImportInput = z.infer<typeof commitImportInput>;

export type ImportStatus = "draft" | "committed" | "reverted";

export type ImportFileSummary = {
	name: string;
	rows: number;
	firstDate: string | null;
	lastDate: string | null;
	new: number;
	duplicate: number;
};

export type ImportReviewRow = {
	key: string;
	reason: "unpaired_transfer" | "ambiguous_transfer";
	account: string;
	type: "expense" | "income";
	amount: number;
	occurredAt: string;
	note: string | null;
};

export type ImportPreview = {
	id: string;
	status: ImportStatus;
	createdAt: string;
	committedAt: string | null;
	files: ImportFileSummary[];
	totals: {
		rows: number;
		new: number;
		duplicate: number;
		transactions: number;
		transferPairs: number;
		savingsTransfers: number;
		referenceMonthFromNote: number;
		debtNotes: number;
		toReview: number;
	};
	accounts: { name: string; rows: number; existingAccountId: string | null }[];
	categories: { walletName: string; rows: number; categoryId: string | null }[];
	review: ImportReviewRow[];
};

export type ImportBatchSummary = Pick<
	ImportPreview,
	"id" | "status" | "createdAt" | "committedAt" | "totals"
> & {
	source: "wallet-csv" | "sheet-xlsx";
	fileNames: string[];
	sheet?: { year: number; months: number; items: number };
};

export const sheetImportInput = z.object({
	name: z.string().trim().min(1).max(200),
	contentBase64: z.string().min(1).max(20_000_000),
	year: z.number().int().min(2000).max(2100),
});
export type SheetImportInput = z.infer<typeof sheetImportInput>;

export const commitSheetInput = z.object({
	accountId: id.nullable().default(null),
	months: z
		.array(
			z.object({
				month: z.string(),
				include: z.boolean(),
				createPayments: z.boolean(),
			}),
		)
		.default([]),
	categories: z.record(z.string(), id.nullable()).default({}),
	expectedIncome: z.number().int().min(0).optional(),
	goals: z
		.array(
			z.object({
				key: z.string(),
				include: z.boolean(),
				target: z.number().int().positive().optional(),
			}),
		)
		.default([]),
	goalAccountId: id.nullable().default(null),
	partGoals: z.record(z.string(), z.string().nullable()).default({}),
	debts: z
		.array(z.object({ key: z.string(), include: z.boolean() }))
		.default([]),
});
export type CommitSheetInput = z.infer<typeof commitSheetInput>;

export type SheetPlanItem = {
	key: string;
	name: string;
	amount: number;
	months: number[];
	group: "fixed" | "savings" | "variable" | "oneoff";
	categoryId: string | null;
	partial: boolean;
	step: number | null;
	toAccountId: string | null;
};

export type SheetGoal = {
	key: string;
	name: string;
	saved: number;
	target: number;
	suggestedTarget: boolean;
};

export type SheetGoalPart = {
	key: string;
	name: string;
	paid: number;
	missing: number;
	goalKey: string | null;
};

export type SheetDebt = {
	key: string;
	person: string;
	direction: "owed_to_me" | "i_owe";
	amount: number;
};

export type SheetMonthPreview = {
	month: string;
	label: string;
	total: number;
	walletSpent: number;
	suggestPayments: boolean;
	items: {
		key: string;
		name: string;
		amount: number;
		categoryId: string | null;
		group: SheetPlanItem["group"];
		planKey: string | null;
		walletSpent: number;
	}[];
};

export type SheetPreview = {
	id: string;
	source: "sheet-xlsx";
	status: ImportStatus;
	createdAt: string;
	committedAt: string | null;
	fileName: string;
	year: number;
	sheetName: string;
	otherSheets: string[];
	planItems: SheetPlanItem[];
	months: SheetMonthPreview[];
	skipped: { row: number; text: string }[];
	goals: SheetGoal[];
	goalParts: SheetGoalPart[];
	goalAccountId: string | null;
	debts: SheetDebt[];
	result?: {
		monthItems: number;
		planItems: number;
		payments: number;
		paymentsSkipped: number;
		goals?: number;
		debts?: number;
	};
};
