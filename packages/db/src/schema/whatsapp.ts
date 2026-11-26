import { sql } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const whatsappLinks = pgTable(
	"whatsapp_links",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		phone: text("phone").notNull(),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		codeHash: text("code_hash"),
		codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
		codeAttempts: integer("code_attempts").default(0).notNull(),
		codesSentAt: jsonb("codes_sent_at").$type<string[]>().default([]).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		uniqueIndex("whatsapp_links_verified_phone_uq")
			.on(t.phone)
			.where(sql`${t.verifiedAt} is not null`),
	],
);

export const whatsappInbox = pgTable("whatsapp_inbox", {
	messageId: text("message_id").primaryKey(),
	receivedAt: timestamp("received_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const whatsappUnknownReplies = pgTable("whatsapp_unknown_replies", {
	phone: text("phone").primaryKey(),
	repliedAt: timestamp("replied_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
