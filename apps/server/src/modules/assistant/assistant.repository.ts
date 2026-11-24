import type { Database } from "@wallet/db";
import {
	assistantConversations,
	assistantMessages,
} from "@wallet/db/schema/assistant";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

export type ConversationRow = typeof assistantConversations.$inferSelect;
export type MessageRow = typeof assistantMessages.$inferSelect;
export type NewMessageRow = typeof assistantMessages.$inferInsert;

const owned = (userId: string, id: string) =>
	and(
		eq(assistantConversations.userId, userId),
		eq(assistantConversations.id, id),
	);

const like = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export class AssistantRepository {
	constructor(private readonly db: Database) {}

	list(userId: string, q?: string): Promise<ConversationRow[]> {
		const matching = q
			? this.db
					.select({ id: assistantMessages.conversationId })
					.from(assistantMessages)
					.where(ilike(assistantMessages.content, like(q)))
			: undefined;
		return this.db
			.select()
			.from(assistantConversations)
			.where(
				and(
					eq(assistantConversations.userId, userId),
					q && matching
						? or(
								ilike(assistantConversations.title, like(q)),
								inArray(assistantConversations.id, matching),
							)
						: undefined,
				),
			)
			.orderBy(
				desc(assistantConversations.pinned),
				desc(assistantConversations.updatedAt),
			)
			.limit(200);
	}

	async lastMessages(ids: string[]) {
		if (!ids.length) return new Map<string, string>();
		const rows = await this.db
			.selectDistinctOn([assistantMessages.conversationId], {
				conversationId: assistantMessages.conversationId,
				content: assistantMessages.content,
			})
			.from(assistantMessages)
			.where(inArray(assistantMessages.conversationId, ids))
			.orderBy(
				assistantMessages.conversationId,
				desc(assistantMessages.createdAt),
			);
		return new Map(rows.map((r) => [r.conversationId, r.content]));
	}

	async find(userId: string, id: string) {
		const [row] = await this.db
			.select()
			.from(assistantConversations)
			.where(owned(userId, id));
		return row;
	}

	messages(conversationId: string): Promise<MessageRow[]> {
		return this.db
			.select()
			.from(assistantMessages)
			.where(eq(assistantMessages.conversationId, conversationId))
			.orderBy(asc(assistantMessages.createdAt), asc(assistantMessages.id));
	}

	async create(userId: string, title: string) {
		const [row] = await this.db
			.insert(assistantConversations)
			.values({ userId, title })
			.returning();
		return row!;
	}

	async update(
		userId: string,
		id: string,
		set: Partial<Pick<ConversationRow, "title" | "pinned">>,
	) {
		const [row] = await this.db
			.update(assistantConversations)
			.set(set)
			.where(owned(userId, id))
			.returning();
		return row;
	}

	async touch(id: string) {
		await this.db
			.update(assistantConversations)
			.set({ updatedAt: sql`now()` })
			.where(eq(assistantConversations.id, id));
	}

	async delete(userId: string, id: string) {
		const rows = await this.db
			.delete(assistantConversations)
			.where(owned(userId, id))
			.returning({ id: assistantConversations.id });
		return rows.length > 0;
	}

	async addMessages(rows: NewMessageRow[]) {
		return this.db.insert(assistantMessages).values(rows).returning();
	}
}
