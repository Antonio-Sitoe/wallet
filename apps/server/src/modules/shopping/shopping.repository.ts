import type { Database } from "@wallet/db";
import { monthItems } from "@wallet/db/schema/budgets";
import { shoppingItems, shoppingLists } from "@wallet/db/schema/shopping";
import { transactions } from "@wallet/db/schema/transactions";
import { and, asc, eq, inArray, max } from "drizzle-orm";

import type {
	NewShoppingItemRow,
	NewShoppingListRow,
	ShoppingItemRow,
	ShoppingItemWithPurchase,
	ShoppingListRow,
	ShoppingListWithMonthItem,
} from "./shopping.types";

const ownedList = (userId: string, id: string) =>
	and(eq(shoppingLists.userId, userId), eq(shoppingLists.id, id));

const ownedItem = (userId: string, listId: string, id: string) =>
	and(
		eq(shoppingItems.userId, userId),
		eq(shoppingItems.listId, listId),
		eq(shoppingItems.id, id),
	);

export class ShoppingRepository {
	constructor(private readonly db: Database) {}

	async lists(
		userId: string,
		options: { includeArchived?: boolean; id?: string } = {},
	): Promise<ShoppingListWithMonthItem[]> {
		const rows = await this.db
			.select({
				list: shoppingLists,
				monthItem: {
					id: monthItems.id,
					month: monthItems.month,
					name: monthItems.name,
					categoryId: monthItems.categoryId,
				},
			})
			.from(shoppingLists)
			.leftJoin(monthItems, eq(monthItems.id, shoppingLists.monthItemId))
			.where(
				and(
					eq(shoppingLists.userId, userId),
					options.id ? eq(shoppingLists.id, options.id) : undefined,
					options.includeArchived || options.id
						? undefined
						: eq(shoppingLists.archived, false),
				),
			)
			.orderBy(asc(shoppingLists.createdAt));
		return rows.map((r) => ({ ...r.list, monthItem: r.monthItem }));
	}

	async insertList(row: NewShoppingListRow): Promise<ShoppingListRow> {
		const [created] = await this.db
			.insert(shoppingLists)
			.values(row)
			.returning();
		return created!;
	}

	async updateList(
		userId: string,
		id: string,
		input: Partial<NewShoppingListRow>,
	) {
		await this.db.update(shoppingLists).set(input).where(ownedList(userId, id));
	}

	async deleteList(userId: string, id: string) {
		await this.db.delete(shoppingLists).where(ownedList(userId, id));
	}

	async items(
		userId: string,
		listIds: string[],
	): Promise<ShoppingItemWithPurchase[]> {
		if (listIds.length === 0) return [];
		const rows = await this.db
			.select({
				item: shoppingItems,
				amount: transactions.amount,
				accountId: transactions.accountId,
				occurredAt: transactions.occurredAt,
			})
			.from(shoppingItems)
			.leftJoin(transactions, eq(transactions.id, shoppingItems.transactionId))
			.where(
				and(
					eq(shoppingItems.userId, userId),
					inArray(shoppingItems.listId, listIds),
				),
			)
			.orderBy(asc(shoppingItems.position), asc(shoppingItems.createdAt));
		return rows.map((r) => ({
			...r.item,
			purchase:
				r.amount !== null && r.accountId !== null && r.occurredAt !== null
					? {
							amount: Math.abs(r.amount),
							accountId: r.accountId,
							occurredAt: r.occurredAt,
						}
					: null,
		}));
	}

	async findItem(
		userId: string,
		listId: string,
		id: string,
	): Promise<ShoppingItemRow | undefined> {
		const [row] = await this.db
			.select()
			.from(shoppingItems)
			.where(ownedItem(userId, listId, id));
		return row;
	}

	async nextPosition(listId: string): Promise<number> {
		const [row] = await this.db
			.select({ top: max(shoppingItems.position) })
			.from(shoppingItems)
			.where(eq(shoppingItems.listId, listId));
		return row?.top === null || row?.top === undefined ? 0 : row.top + 1;
	}

	async insertItem(row: NewShoppingItemRow): Promise<ShoppingItemRow> {
		const [created] = await this.db
			.insert(shoppingItems)
			.values(row)
			.returning();
		return created!;
	}

	async updateItem(
		userId: string,
		listId: string,
		id: string,
		input: Partial<NewShoppingItemRow>,
	) {
		await this.db
			.update(shoppingItems)
			.set(input)
			.where(ownedItem(userId, listId, id));
	}

	async deleteItem(userId: string, listId: string, id: string) {
		await this.db.delete(shoppingItems).where(ownedItem(userId, listId, id));
	}
}
