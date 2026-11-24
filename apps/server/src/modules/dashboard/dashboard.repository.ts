import type { Database } from "@wallet/db";
import { dashboardCards } from "@wallet/db/schema/dashboard";
import { and, asc, eq } from "drizzle-orm";

import type { CardSize } from "./dashboard.schema";
import {
	type IDashboardRepository,
	type NewCardRow,
	SEEDED_MARKER,
} from "./dashboard.types";

const owned = (userId: string, id: string) =>
	and(eq(dashboardCards.userId, userId), eq(dashboardCards.id, id));

export class DashboardRepository implements IDashboardRepository {
	constructor(private readonly db: Database) {}

	list(userId: string) {
		return this.db
			.select()
			.from(dashboardCards)
			.where(eq(dashboardCards.userId, userId))
			.orderBy(asc(dashboardCards.position), asc(dashboardCards.createdAt));
	}

	async hasMarker(userId: string) {
		const [row] = await this.db
			.select({ id: dashboardCards.id })
			.from(dashboardCards)
			.where(
				and(
					eq(dashboardCards.userId, userId),
					eq(dashboardCards.type, SEEDED_MARKER),
				),
			)
			.limit(1);
		return !!row;
	}

	async insert(row: NewCardRow) {
		const [created] = await this.db
			.insert(dashboardCards)
			.values(row)
			.returning();
		return created!;
	}

	async insertMany(rows: NewCardRow[]) {
		if (rows.length > 0) await this.db.insert(dashboardCards).values(rows);
	}

	async update(
		userId: string,
		id: string,
		set: { size?: CardSize; config?: Record<string, unknown> },
	) {
		const [row] = await this.db
			.update(dashboardCards)
			.set(set)
			.where(owned(userId, id))
			.returning();
		return row;
	}

	async delete(userId: string, id: string) {
		const removed = await this.db
			.delete(dashboardCards)
			.where(owned(userId, id))
			.returning({ id: dashboardCards.id });
		return removed.length > 0;
	}

	async deleteAll(userId: string) {
		await this.db
			.delete(dashboardCards)
			.where(eq(dashboardCards.userId, userId));
	}

	async setOrder(userId: string, ids: string[]) {
		await this.db.transaction(async (tx) => {
			for (const [position, id] of ids.entries()) {
				await tx
					.update(dashboardCards)
					.set({ position })
					.where(owned(userId, id));
			}
		});
	}
}
