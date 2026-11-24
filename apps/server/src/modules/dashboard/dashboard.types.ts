import type { dashboardCards } from "@wallet/db/schema/dashboard";

import type { CardSize } from "./dashboard.schema";

export type CardRow = typeof dashboardCards.$inferSelect;
export type NewCardRow = typeof dashboardCards.$inferInsert;

export const SEEDED_MARKER = "__seeded";

export interface IDashboardRepository {
	list(userId: string): Promise<CardRow[]>;
	hasMarker(userId: string): Promise<boolean>;
	insert(row: NewCardRow): Promise<CardRow>;
	insertMany(rows: NewCardRow[]): Promise<void>;
	update(
		userId: string,
		id: string,
		set: { size?: CardSize; config?: Record<string, unknown> },
	): Promise<CardRow | undefined>;
	delete(userId: string, id: string): Promise<boolean>;
	deleteAll(userId: string): Promise<void>;
	setOrder(userId: string, ids: string[]): Promise<void>;
}
