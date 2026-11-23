import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	index,
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
import { monthItems } from "./budgets";
import { categories } from "./categories";
import { goals } from "./goals";
import { importBatches } from "./imports";

export const transactionType = pgEnum("transaction_type", [
	"expense",
	"income",
	"transfer",
	"adjustment",
]);

export const transfers = pgTable(
	"transfers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		fromAccountId: uuid("from_account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "restrict" }),
		toAccountId: uuid("to_account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "restrict" }),
		amount: bigint("amount", { mode: "number" }).notNull(),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
			onDelete: "set null",
		}),
		goalId: uuid("goal_id").references(() => goals.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("transfers_user_idx").on(t.userId),
		index("transfers_goal_idx").on(t.goalId),
		check("transfers_amount_positive", sql`${t.amount} > 0`),
		check(
			"transfers_distinct_accounts",
			sql`${t.fromAccountId} <> ${t.toAccountId}`,
		),
	],
);

export const transactions = pgTable(
	"transactions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accountId: uuid("account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "restrict" }),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		type: transactionType("type").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		referenceMonth: varchar("reference_month", { length: 7 }).notNull(),
		note: text("note"),
		payee: text("payee"),
		labels: text("labels").array().notNull().default(sql`'{}'::text[]`),
		paymentType: text("payment_type"),
		currency: varchar("currency", { length: 3 }).notNull().default("MZN"),
		refAmount: bigint("ref_amount", { mode: "number" }),
		transferId: uuid("transfer_id").references(() => transfers.id, {
			onDelete: "cascade",
		}),
		monthItemId: uuid("month_item_id").references(() => monthItems.id, {
			onDelete: "set null",
		}),
		importHash: text("import_hash"),
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
		index("transactions_user_date_idx").on(
			t.userId,
			t.occurredAt.desc(),
			t.id.desc(),
		),
		index("transactions_account_idx").on(t.accountId),
		index("transactions_category_idx").on(t.categoryId),
		index("transactions_transfer_idx").on(t.transferId),
		index("transactions_batch_idx").on(t.importBatchId),
		index("transactions_month_item_idx").on(t.monthItemId),
		index("transactions_user_month_idx").on(t.userId, t.referenceMonth),
		uniqueIndex("transactions_user_import_hash_uq")
			.on(t.userId, t.importHash)
			.where(sql`${t.importHash} is not null`),
		check("transactions_amount_nonzero", sql`${t.amount} <> 0`),
		check(
			"transactions_reference_month_format",
			sql`${t.referenceMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
		),
		check(
			"transactions_sign_matches_type",
			sql`(${t.type} = 'expense' and ${t.amount} < 0) or (${t.type} = 'income' and ${t.amount} > 0) or ${t.type} in ('transfer', 'adjustment')`,
		),
		check(
			"transactions_transfer_link",
			sql`(${t.type} = 'transfer') = (${t.transferId} is not null)`,
		),
	],
);
