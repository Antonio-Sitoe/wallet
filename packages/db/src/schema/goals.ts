import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { user } from "./auth";
import { planItems } from "./budgets";
import { importBatches } from "./imports";

export const goals = pgTable(
	"goals",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		color: varchar("color", { length: 7 }),
		target: bigint("target", { mode: "number" }).notNull(),
		startingAmount: bigint("starting_amount", { mode: "number" })
			.notNull()
			.default(0),
		accountId: uuid("account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "restrict" }),
		deadline: varchar("deadline", { length: 7 }),
		planItemId: uuid("plan_item_id").references(() => planItems.id, {
			onDelete: "set null",
		}),
		archived: boolean("archived").notNull().default(false),
		sortOrder: integer("sort_order").notNull().default(0),
		importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("goals_user_idx").on(t.userId),
		check("goals_target_positive", sql`${t.target} > 0`),
		check("goals_starting_amount_nonnegative", sql`${t.startingAmount} >= 0`),
		check(
			"goals_deadline_format",
			sql`${t.deadline} is null or ${t.deadline} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
		),
	],
);

export const goalParts = pgTable(
	"goal_parts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		goalId: uuid("goal_id")
			.notNull()
			.references(() => goals.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		paid: boolean("paid").notNull().default(false),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("goal_parts_goal_idx").on(t.goalId),
		check("goal_parts_amount_positive", sql`${t.amount} > 0`),
	],
);
