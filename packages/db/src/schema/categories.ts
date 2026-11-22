import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const categoryKind = pgEnum("category_kind", [
	"expense",
	"income",
	"system",
]);

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** Stable key for the categories the app seeds ("transporte", "educacao.faculdade"); null for the user's own. */
		slug: text("slug"),
		name: text("name").notNull(),
		kind: categoryKind("kind").notNull(),
		parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
			onDelete: "restrict",
		}),
		color: text("color"),
		icon: text("icon"),
		isSystem: boolean("is_system").notNull().default(false),
		archived: boolean("archived").notNull().default(false),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("categories_user_idx").on(t.userId),
		index("categories_parent_idx").on(t.parentId),
		uniqueIndex("categories_user_slug_uq").on(t.userId, t.slug),
		uniqueIndex("categories_user_parent_name_uq").on(
			t.userId,
			sql`coalesce(${t.parentId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
			sql`lower(${t.name})`,
		),
	],
);

/** Wallet (BudgetBakers) category name → app category, reused on every import. */
export const walletCategoryMap = pgTable(
	"wallet_category_map",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		walletName: text("wallet_name").notNull(),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
	},
	(t) => [primaryKey({ columns: [t.userId, t.walletName] })],
);
