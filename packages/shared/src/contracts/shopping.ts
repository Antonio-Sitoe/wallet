import { z } from "zod";

import { id, positiveCents } from "./common";

const name = z.string().trim().min(1).max(120);
const quantity = z.number().positive().max(100_000);

export const createShoppingListInput = z.object({
	name,
	accountId: id.nullable().optional(),
	categoryId: id.nullable().optional(),
	monthItemId: id.nullable().optional(),
});
export type CreateShoppingListInput = z.infer<typeof createShoppingListInput>;

export const updateShoppingListInput = z
	.object({
		name,
		accountId: id.nullable(),
		categoryId: id.nullable(),
		monthItemId: id.nullable(),
		archived: z.boolean(),
	})
	.partial();
export type UpdateShoppingListInput = z.infer<typeof updateShoppingListInput>;

export const listShoppingListsQuery = z.object({
	includeArchived: z.stringbool().default(false),
});

export const addShoppingItemInput = z.object({
	name,
	quantity: quantity.default(1),
	unitPrice: positiveCents.nullable().optional(),
});
export type AddShoppingItemInput = z.input<typeof addShoppingItemInput>;

export const updateShoppingItemInput = z
	.object({
		name,
		quantity,
		unitPrice: positiveCents.nullable(),
		position: z.number().int().min(0),
	})
	.partial();
export type UpdateShoppingItemInput = z.infer<typeof updateShoppingItemInput>;

export const buyShoppingItemInput = z.object({
	amount: positiveCents,
	accountId: id.optional(),
	occurredAt: z.coerce.date().optional(),
});
export type BuyShoppingItemInput = z.infer<typeof buyShoppingItemInput>;

export const shoppingItemParams = z.object({ id, itemId: id });

export type ShoppingItem = {
	id: string;
	name: string;
	quantity: number;
	unitPrice: number | null;
	estimated: number;
	position: number;
	bought: boolean;
	transactionId: string | null;
	actual: number | null;
	accountId: string | null;
	boughtAt: string | null;
};

export type ShoppingTotals = {
	items: number;
	bought: number;
	estimated: number;
	estimatedBought: number;
	actual: number;
	estimatedLeft: number;
};

export type ShoppingListSummary = {
	id: string;
	name: string;
	accountId: string | null;
	categoryId: string | null;
	monthItemId: string | null;
	monthItem: { id: string; month: string; name: string } | null;
	archived: boolean;
	createdAt: string;
	totals: ShoppingTotals;
};

export type ShoppingList = ShoppingListSummary & { items: ShoppingItem[] };
