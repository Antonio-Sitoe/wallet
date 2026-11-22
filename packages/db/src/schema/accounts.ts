import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const accountType = pgEnum("account_type", [
	"bank",
	"mobile_wallet",
	"cash",
	"savings",
]);

export const accounts = pgTable(
	"accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		type: accountType("type").notNull(),
		/** Centavos. */
		initialBalance: bigint("initial_balance", { mode: "number" })
			.notNull()
			.default(0),
		color: text("color"),
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
		index("accounts_user_idx").on(t.userId),
		uniqueIndex("accounts_user_name_uq").on(t.userId, sql`lower(${t.name})`),
	],
);
