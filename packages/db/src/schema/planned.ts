import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
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
import { planItems } from "./budgets";
import { categories } from "./categories";
import { transactions, transfers } from "./transactions";

export const plannedKind = pgEnum("planned_kind", ["expense", "transfer"]);

export const plannedFrequency = pgEnum("planned_frequency", [
	"once",
	"monthly",
	"yearly",
]);

export const plannedEventStatus = pgEnum("planned_event_status", [
	"paid",
	"skipped",
]);

export const plannedPayments = pgTable(
	"planned_payments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		kind: plannedKind("kind").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		accountId: uuid("account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		toAccountId: uuid("to_account_id").references(() => accounts.id, {
			onDelete: "set null",
		}),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		frequency: plannedFrequency("frequency").notNull(),
		startDate: varchar("start_date", { length: 10 }).notNull(),
		endDate: varchar("end_date", { length: 10 }),
		remindDays: integer("remind_days"),
		planItemId: uuid("plan_item_id").references(() => planItems.id, {
			onDelete: "set null",
		}),
		note: text("note"),
		archived: boolean("archived").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("planned_payments_user_idx").on(t.userId),
		check("planned_payments_amount_positive", sql`${t.amount} > 0`),
		check(
			"planned_payments_dates_format",
			sql`${t.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and (${t.endDate} is null or ${t.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')`,
		),
	],
);

export const plannedPaymentEvents = pgTable(
	"planned_payment_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		paymentId: uuid("payment_id")
			.notNull()
			.references(() => plannedPayments.id, { onDelete: "cascade" }),
		dueDate: varchar("due_date", { length: 10 }).notNull(),
		status: plannedEventStatus("status").notNull(),
		transactionId: uuid("transaction_id").references(() => transactions.id, {
			onDelete: "set null",
		}),
		transferId: uuid("transfer_id").references(() => transfers.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("planned_payment_events_due_uq").on(t.paymentId, t.dueDate),
		index("planned_payment_events_user_idx").on(t.userId),
	],
);
