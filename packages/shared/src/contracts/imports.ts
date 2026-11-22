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

/**
 * How to handle a transfer row whose other side is missing:
 * - "ignore": leave it out (default)
 * - "keep": import it as a plain expense/income in Transferência
 * - { transferTo }: create the missing side in that account
 */
export const reviewResolution = z.union([
	z.literal("ignore"),
	z.literal("keep"),
	z.object({ transferTo: id }),
]);
export type ReviewResolution = z.infer<typeof reviewResolution>;

export const commitImportInput = z.object({
	/** Wallet category name → app category, for names the saved mapping does not cover. */
	categoryMap: z.record(z.string(), id).default({}),
	/** Review row key → decision. */
	resolutions: z.record(z.string(), reviewResolution).default({}),
});
export type CommitImportInput = z.infer<typeof commitImportInput>;

export type ImportStatus = "draft" | "committed" | "reverted";

export type ImportFileSummary = {
	name: string;
	rows: number;
	firstDate: string | null;
	lastDate: string | null;
	/** Rows not seen in an earlier file of this batch nor in the database. */
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
		/** "Estique ou xitique" rows turned into transfers to/from the Xitique savings account. */
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
	fileNames: string[];
};
