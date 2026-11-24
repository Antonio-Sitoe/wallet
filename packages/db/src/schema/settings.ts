import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { user } from "./auth";
import { categories } from "./categories";
import { transactionType } from "./transactions";

export const userPreferences = pgTable("user_preferences", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	theme: text("theme").notNull().default("system"),
	hideMoney: boolean("hide_money").notNull().default(false),
	density: text("density").notNull().default("compact"),
	numberFormat: text("number_format").notNull().default("space"),
	confirmOnCheck: text("confirm_on_check").notNull().default("always"),
	expectedIncome: bigint("expected_income", { mode: "number" }),
	salaryAccountId: uuid("salary_account_id").references(() => accounts.id, {
		onDelete: "set null",
	}),
	notifications: jsonb("notifications").notNull().default({}),
	shortcuts: jsonb("shortcuts").notNull().default({}),
	pinHash: text("pin_hash"),
	pinFailedAttempts: integer("pin_failed_attempts").notNull().default(0),
	pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const transactionTemplates = pgTable(
	"transaction_templates",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		type: transactionType("type").notNull(),
		amount: bigint("amount", { mode: "number" }),
		accountId: uuid("account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		toAccountId: uuid("to_account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		payee: text("payee"),
		note: text("note"),
		position: integer("position").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [index("transaction_templates_user_idx").on(t.userId, t.position)],
);
