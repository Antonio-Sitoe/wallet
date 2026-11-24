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
	varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { user } from "./auth";
import { categories } from "./categories";

export const budgetGroup = pgEnum("budget_group", [
	"fixed",
	"savings",
	"variable",
	"oneoff",
]);
export const budgetFrequency = pgEnum("budget_frequency", [
	"monthly",
	"months",
	"once",
]);

/** One plan per user and year. */
export const budgetPlans = pgTable(
	"budget_plans",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		year: integer("year").notNull(),
		/** Expected monthly salary, centavos. */
		expectedIncome: bigint("expected_income", { mode: "number" })
			.notNull()
			.default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [uniqueIndex("budget_plans_user_year_uq").on(t.userId, t.year)],
);

/** A line of the yearly plan: "Moradia 5 000 every month". */
export const planItems = pgTable(
	"plan_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		planId: uuid("plan_id")
			.notNull()
			.references(() => budgetPlans.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		group: budgetGroup("group").notNull().default("fixed"),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		amount: bigint("amount", { mode: "number" }).notNull(),
		frequency: budgetFrequency("frequency").notNull().default("monthly"),
		/** For "months" and "once": the months (1–12). Empty for "monthly". */
		months: integer("months").array().notNull().default(sql`'{}'::integer[]`),
		accountId: uuid("account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		toAccountId: uuid("to_account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		partial: boolean("partial").notNull().default(false),
		step: bigint("step", { mode: "number" }),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index("plan_items_plan_idx").on(t.planId)],
);

/** A line of one month's list. Generated from a plan item, or added to the month as "não planeado". */
export const monthItems = pgTable(
	"month_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		planId: uuid("plan_id").references(() => budgetPlans.id, {
			onDelete: "cascade",
		}),
		/** Null for unplanned items, or once the plan item was deleted. */
		planItemId: uuid("plan_item_id").references(() => planItems.id, {
			onDelete: "set null",
		}),
		month: varchar("month", { length: 7 }).notNull(),
		name: text("name").notNull(),
		group: budgetGroup("group").notNull().default("fixed"),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		accountId: uuid("account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		toAccountId: uuid("to_account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		plannedAmount: bigint("planned_amount", { mode: "number" }).notNull(),
		partial: boolean("partial").notNull().default(false),
		step: bigint("step", { mode: "number" }),
		unplanned: boolean("unplanned").notNull().default(false),
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
		index("month_items_user_month_idx").on(t.userId, t.month),
		uniqueIndex("month_items_plan_item_month_uq")
			.on(t.planItemId, t.month)
			.where(sql`${t.planItemId} is not null`),
	],
);
