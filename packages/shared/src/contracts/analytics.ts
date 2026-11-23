import { z } from "zod";

import { id } from "./common";

/** A calendar day in Mozambique time: "2026-11-23". */
export const dateOnly = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

/** Both ends inclusive, as days in Mozambique time. */
export const periodQuery = z
	.object({ from: dateOnly, to: dateOnly })
	.refine((v) => v.from <= v.to, {
		message: "O início tem de ser antes do fim",
		path: ["to"],
	})
	.refine(
		(v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= 3 * 366,
		{
			message: "No máximo 3 anos",
			path: ["to"],
		},
	);
export type PeriodQuery = z.infer<typeof periodQuery>;

export const BUCKETS = ["day", "week", "month"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const trendQuery = z.object({
	from: dateOnly,
	to: dateOnly,
	/** Defaults to day up to 45 days, week up to ~6 months, month beyond. */
	bucket: z.enum(BUCKETS).optional(),
});

export const categoriesQuery = z.object({
	from: dateOnly,
	to: dateOnly,
	limit: z.coerce.number().int().min(1).max(50).default(8),
});

export type PeriodRange = { from: string; to: string; days: number };

export type Overview = {
	period: PeriodRange;
	previous: PeriodRange;
	/** Total balance of every account at the start and at the end of the period. */
	balance: { start: number; end: number };
	income: number;
	expense: number;
	/** income − expense. Transfers are neither. */
	net: number;
	previousTotals: { income: number; expense: number; net: number };
};

export type CashflowPoint = {
	start: string;
	end: string;
	income: number;
	expense: number;
	net: number;
};
export type CashflowTrend = { bucket: Bucket; points: CashflowPoint[] };

export type BalancePoint = { date: string; balance: number };

export type CategorySpending = {
	/** Top-level category; null for expenses without a category. */
	categoryId: string | null;
	name: string;
	color: string | null;
	expense: number;
	previousExpense: number;
	/** Share of the period's total expense, 0–1. */
	share: number;
};
export type CategoryBreakdown = {
	total: number;
	previousTotal: number;
	items: CategorySpending[];
	others: number;
};

/** Cumulative income − expense, day by day from the start of each period. */
export type ComparisonPoint = {
	day: number;
	date: string;
	current: number | null;
	previous: number;
	yearAgo: number;
};

// ---- Dashboard layout

export const DASHBOARD_CARD_TYPES = [
	"summary",
	"cash-flow",
	"cash-flow-trend",
	"period-comparison",
	"balance-trend",
	"spending-by-category",
	"accounts",
	"upcoming",
	"last-records",
] as const;
export type DashboardCardType = (typeof DASHBOARD_CARD_TYPES)[number];

export const CARD_SIZES = ["half", "full"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export type DashboardCard = {
	id: string;
	type: DashboardCardType;
	size: CardSize;
	position: number;
	config: Record<string, unknown>;
};

export const createCardInput = z.object({
	type: z.enum(DASHBOARD_CARD_TYPES),
	size: z.enum(CARD_SIZES).optional(),
	config: z.record(z.string(), z.unknown()).default({}),
});
export type CreateCardInput = z.infer<typeof createCardInput>;

export const updateCardInput = z
	.object({
		size: z.enum(CARD_SIZES),
		config: z.record(z.string(), z.unknown()),
	})
	.partial();

export const reorderCardsInput = z.object({ ids: z.array(id).min(1).max(50) });
