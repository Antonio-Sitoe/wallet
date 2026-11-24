import {
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const importStatus = pgEnum("import_status", [
	"draft",
	"committed",
	"reverted",
]);

export const importBatches = pgTable(
	"import_batches",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		source: text("source").notNull(),
		status: importStatus("status").notNull().default("draft"),
		/** Per-file and overall counts shown in the preview. */
		summary: jsonb("summary").notNull(),
		/** The parsed, de-duplicated rows waiting for commit. Cleared once committed. */
		plan: jsonb("plan"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		committedAt: timestamp("committed_at", { withTimezone: true }),
		revertedAt: timestamp("reverted_at", { withTimezone: true }),
	},
	(t) => [index("import_batches_user_idx").on(t.userId, t.createdAt)],
);
