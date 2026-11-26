import type { Database } from "@wallet/db";
import {
	whatsappInbox,
	whatsappLinks,
	whatsappUnknownReplies,
} from "@wallet/db/schema/whatsapp";
import { and, eq, isNotNull, lt, ne, sql } from "drizzle-orm";

import type { WhatsappLinkRow } from "./whatsapp.types";

export class WhatsappRepository {
	constructor(private readonly db: Database) {}

	async findByUser(userId: string): Promise<WhatsappLinkRow | undefined> {
		const [row] = await this.db
			.select()
			.from(whatsappLinks)
			.where(eq(whatsappLinks.userId, userId));
		return row;
	}

	async verifiedElsewhere(phone: string, userId: string) {
		const [row] = await this.db
			.select({ id: whatsappLinks.id })
			.from(whatsappLinks)
			.where(
				and(
					eq(whatsappLinks.phone, phone),
					isNotNull(whatsappLinks.verifiedAt),
					ne(whatsappLinks.userId, userId),
				),
			);
		return !!row;
	}

	async userByVerifiedPhone(phone: string) {
		const [row] = await this.db
			.select({ userId: whatsappLinks.userId })
			.from(whatsappLinks)
			.where(
				and(eq(whatsappLinks.phone, phone), isNotNull(whatsappLinks.verifiedAt)),
			);
		return row?.userId ?? null;
	}

	async savePending(
		userId: string,
		values: {
			phone: string;
			codeHash: string;
			codeExpiresAt: Date;
			codesSentAt: string[];
		},
	) {
		const pending = { ...values, verifiedAt: null, codeAttempts: 0 };
		await this.db
			.insert(whatsappLinks)
			.values({ userId, ...pending })
			.onConflictDoUpdate({ target: whatsappLinks.userId, set: pending });
	}

	async countAttempt(userId: string) {
		await this.db
			.update(whatsappLinks)
			.set({ codeAttempts: sql`${whatsappLinks.codeAttempts} + 1` })
			.where(eq(whatsappLinks.userId, userId));
	}

	async markVerified(userId: string) {
		await this.db
			.update(whatsappLinks)
			.set({
				verifiedAt: new Date(),
				codeHash: null,
				codeExpiresAt: null,
				codeAttempts: 0,
			})
			.where(eq(whatsappLinks.userId, userId));
	}

	async remove(userId: string) {
		await this.db.delete(whatsappLinks).where(eq(whatsappLinks.userId, userId));
	}

	async claimMessage(messageId: string) {
		const rows = await this.db
			.insert(whatsappInbox)
			.values({ messageId })
			.onConflictDoNothing()
			.returning({ messageId: whatsappInbox.messageId });
		return rows.length > 0;
	}

	async claimUnknownReply(phone: string, since: Date) {
		const rows = await this.db
			.insert(whatsappUnknownReplies)
			.values({ phone })
			.onConflictDoUpdate({
				target: whatsappUnknownReplies.phone,
				set: { repliedAt: new Date() },
				setWhere: lt(whatsappUnknownReplies.repliedAt, since),
			})
			.returning({ phone: whatsappUnknownReplies.phone });
		return rows.length > 0;
	}
}
