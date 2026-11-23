import type { shoppingItems, shoppingLists } from "@wallet/db/schema/shopping";
import type { CreateTransactionInput } from "@wallet/shared";

export type ShoppingListRow = typeof shoppingLists.$inferSelect;
export type NewShoppingListRow = typeof shoppingLists.$inferInsert;
export type ShoppingItemRow = typeof shoppingItems.$inferSelect;
export type NewShoppingItemRow = typeof shoppingItems.$inferInsert;

export type ShoppingListWithMonthItem = ShoppingListRow & {
	monthItem: {
		id: string;
		month: string;
		name: string;
		categoryId: string | null;
	} | null;
};

export type ShoppingItemWithPurchase = ShoppingItemRow & {
	purchase: { amount: number; accountId: string; occurredAt: Date } | null;
};

export type ShoppingDeps = {
	accounts: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
	categories: {
		assertOwned(userId: string, ids: string[]): Promise<void>;
	};
	budgets: {
		assertMonthItemOwned(userId: string, id: string): Promise<void>;
	};
	transactions: {
		create(
			userId: string,
			input: CreateTransactionInput,
		): Promise<{ id: string }>;
		remove(userId: string, id: string): Promise<void>;
	};
};
