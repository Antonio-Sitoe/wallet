import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { importBatches } from "./imports";

export const debtDirection = pgEnum("debt_direction", ["owed_to_me", "i_owe"]);

export const debts = pgTable(
	"debts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		person: text("person").notNull(),
		direction: debtDirection("direction").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		note: text("note"),
		remindOn: varchar("remind_on", { length: 10 }),
		archived: boolean("archived").notNull().default(false),
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
		index("debts_user_idx").on(t.userId),
		check("debts_amount_positive", sql`${t.amount} > 0`),
		check(
			"debts_remind_on_format",
			sql`${t.remindOn} is null or ${t.remindOn} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`,
		),
	],
);

export const debtIgnoredPeople = pgTable(
	"debt_ignored_people",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		personKey: text("person_key").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [primaryKey({ columns: [t.userId, t.personKey] })],
);
