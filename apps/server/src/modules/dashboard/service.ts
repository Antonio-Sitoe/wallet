import type { Database } from "@wallet/db";
import { dashboardCards } from "@wallet/db/schema/dashboard";
import type {
	CardSize,
	CreateCardInput,
	DashboardCard,
	DashboardCardType,
} from "@wallet/shared";
import { and, asc, eq, inArray } from "drizzle-orm";

import { notFound, unprocessable } from "../../lib/errors";

const DEFAULT_SIZE: Record<DashboardCardType, CardSize> = {
	summary: "full",
	"cash-flow": "half",
	"cash-flow-trend": "half",
	"period-comparison": "half",
	"balance-trend": "half",
	"spending-by-category": "half",
	accounts: "half",
	upcoming: "half",
	"last-records": "half",
};

/** What a new user sees: the design's dashboard, made of removable cards. */
const DEFAULT_LAYOUT: {
	type: DashboardCardType;
	config?: Record<string, unknown>;
}[] = [
	{ type: "summary" },
	{ type: "cash-flow-trend", config: { range: "year" } },
	{ type: "accounts" },
	{ type: "spending-by-category" },
	{ type: "upcoming" },
	{ type: "period-comparison" },
	{ type: "last-records" },
];

type Row = typeof dashboardCards.$inferSelect;

const toCard = (r: Row): DashboardCard => ({
	id: r.id,
	type: r.type as DashboardCardType,
	size: r.size,
	position: r.position,
	config: (r.config ?? {}) as Record<string, unknown>,
});

export function createDashboardService(db: Database) {
	const rows = (userId: string) =>
		db
			.select()
			.from(dashboardCards)
			.where(eq(dashboardCards.userId, userId))
			.orderBy(asc(dashboardCards.position), asc(dashboardCards.createdAt));

	const service = {
		/** Seeds the default layout the first time; an emptied dashboard stays empty. */
		async list(userId: string): Promise<DashboardCard[]> {
			let cards = await rows(userId);
			if (cards.length === 0 && !(await service.wasSeeded(userId))) {
				await db.insert(dashboardCards).values(
					DEFAULT_LAYOUT.map((c, position) => ({
						userId,
						type: c.type,
						size: DEFAULT_SIZE[c.type],
						position,
						config: c.config ?? {},
					})),
				);
				cards = await rows(userId);
			}
			return cards.filter((r) => r.type !== "__seeded").map(toCard);
		},

		/** A user who removed every card keeps a placeholder row of type "__seeded" so defaults don't come back. */
		async wasSeeded(userId: string) {
			const [row] = await db
				.select({ id: dashboardCards.id })
				.from(dashboardCards)
				.where(
					and(
						eq(dashboardCards.userId, userId),
						eq(dashboardCards.type, "__seeded"),
					),
				)
				.limit(1);
			return !!row;
		},

		async add(userId: string, input: CreateCardInput) {
			const current = await service.list(userId);
			const [row] = await db
				.insert(dashboardCards)
				.values({
					userId,
					type: input.type,
					size: input.size ?? DEFAULT_SIZE[input.type],
					position: current.length,
					config: input.config,
				})
				.returning();
			return toCard(row!);
		},

		async update(
			userId: string,
			id: string,
			input: { size?: CardSize; config?: Record<string, unknown> },
		) {
			const [row] = await db
				.update(dashboardCards)
				.set(input)
				.where(
					and(eq(dashboardCards.userId, userId), eq(dashboardCards.id, id)),
				)
				.returning();
			if (!row) throw notFound("Carta");
			return toCard(row);
		},

		async remove(userId: string, id: string) {
			const removed = await db
				.delete(dashboardCards)
				.where(
					and(eq(dashboardCards.userId, userId), eq(dashboardCards.id, id)),
				)
				.returning({ id: dashboardCards.id });
			if (removed.length === 0) throw notFound("Carta");
			if (
				(await rows(userId)).filter((r) => r.type !== "__seeded").length === 0
			) {
				await db
					.insert(dashboardCards)
					.values({ userId, type: "__seeded", position: 9999 });
			}
		},

		/** Saves a new order; `ids` must be exactly the user's cards. */
		async reorder(userId: string, ids: string[]) {
			const current = (await rows(userId)).filter((r) => r.type !== "__seeded");
			const known = new Set(current.map((r) => r.id));
			if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
				throw unprocessable(
					"INVALID_ORDER",
					"A ordem tem de incluir todas as cartas, uma vez cada",
				);
			}
			await db.transaction(async (tx) => {
				for (const [position, id] of ids.entries()) {
					await tx
						.update(dashboardCards)
						.set({ position })
						.where(
							and(
								eq(dashboardCards.userId, userId),
								inArray(dashboardCards.id, [id]),
							),
						);
				}
			});
			return service.list(userId);
		},

		/** Back to the design's default dashboard. */
		async reset(userId: string) {
			await db.delete(dashboardCards).where(eq(dashboardCards.userId, userId));
			return service.list(userId);
		},
	};
	return service;
}

export type DashboardService = ReturnType<typeof createDashboardService>;
