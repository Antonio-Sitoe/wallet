import { z } from "zod";

import { hexColor, id } from "./common";

/** "system" is for categories the app manages itself, like Transferência. */
export const CATEGORY_KINDS = ["expense", "income", "system"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const createCategoryInput = z.object({
	name: z.string().trim().min(1).max(80),
	kind: z.enum(["expense", "income"]),
	parentId: id.nullable().default(null),
	color: hexColor.optional(),
	icon: z.string().max(40).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategoryInput>;

export const updateCategoryInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		kind: z.enum(["expense", "income"]),
		parentId: id.nullable(),
		color: hexColor.nullable(),
		icon: z.string().max(40).nullable(),
		archived: z.boolean(),
	})
	.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategoryInput>;

export const setWalletMappingInput = z.object({
	walletName: z.string().trim().min(1).max(120),
	categoryId: id.nullable(),
});
export type SetWalletMappingInput = z.infer<typeof setWalletMappingInput>;

export type Category = {
	id: string;
	name: string;
	kind: CategoryKind;
	parentId: string | null;
	color: string | null;
	icon: string | null;
	isSystem: boolean;
	archived: boolean;
	/** Wallet category names that import into this one. */
	walletNames: string[];
	transactionCount: number;
};

export type WalletMapping = {
	walletName: string;
	categoryId: string | null;
};
