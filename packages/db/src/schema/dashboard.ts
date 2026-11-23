import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const cardSize = pgEnum("card_size", ["half", "full"]);

/** The cards on a user's dashboard, in order. The card types live in @wallet/shared. */
export const dashboardCards = pgTable(
	"dashboard_cards",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		size: cardSize("size").notNull().default("half"),
		position: integer("position").notNull().default(0),
		config: jsonb("config").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [index("dashboard_cards_user_idx").on(t.userId, t.position)],
);
