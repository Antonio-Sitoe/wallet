import {
	boolean,
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const assistantRole = pgEnum("assistant_role", ["user", "assistant"]);

export const assistantConversations = pgTable(
	"assistant_conversations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		pinned: boolean("pinned").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("assistant_conversations_user_idx").on(t.userId, t.updatedAt.desc()),
	],
);

export const assistantMessages = pgTable(
	"assistant_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => assistantConversations.id, { onDelete: "cascade" }),
		role: assistantRole("role").notNull(),
		content: text("content").notNull(),
		data: jsonb("data"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("assistant_messages_conversation_idx").on(
			t.conversationId,
			t.createdAt,
		),
	],
);
