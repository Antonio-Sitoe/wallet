import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	doublePrecision,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { user } from "./auth";
import { monthItems } from "./budgets";
import { categories } from "./categories";
import { transactions } from "./transactions";

export const shoppingLists = pgTable(
	"shopping_lists",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		accountId: uuid("account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		monthItemId: uuid("month_item_id").references(() => monthItems.id, {
			onDelete: "set null",
		}),
		archived: boolean("archived").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index("shopping_lists_user_idx").on(t.userId)],
);

export const shoppingItems = pgTable(
	"shopping_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		listId: uuid("list_id")
			.notNull()
			.references(() => shoppingLists.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		quantity: doublePrecision("quantity").notNull().default(1),
		unitPrice: bigint("unit_price", { mode: "number" }),
		position: integer("position").notNull().default(0),
		transactionId: uuid("transaction_id").references(() => transactions.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("shopping_items_list_idx").on(t.listId),
		index("shopping_items_transaction_idx").on(t.transactionId),
		check("shopping_items_quantity_positive", sql`${t.quantity} > 0`),
		check(
			"shopping_items_unit_price_positive",
			sql`${t.unitPrice} is null or ${t.unitPrice} > 0`,
		),
	],
);
