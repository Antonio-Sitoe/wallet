import { z } from "zod";

import { id } from "./common";

export const dateOnly = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

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
	bucket: z.enum(BUCKETS).optional(),
});

export const balanceQuery = trendQuery.extend({ accountId: id.optional() });

export const categoriesQuery = z.object({
	from: dateOnly,
	to: dateOnly,
	limit: z.coerce.number().int().min(1).max(50).default(8),
});

export const BREAKDOWN_DIMENSIONS = ["category", "account"] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];
export const MONEY_FLOWS = ["expense", "income"] as const;
export type MoneyFlow = (typeof MONEY_FLOWS)[number];

export const breakdownQuery = z.object({
	from: dateOnly,
	to: dateOnly,
	by: z.enum(BREAKDOWN_DIMENSIONS),
	flow: z.enum(MONEY_FLOWS).default("expense"),
	limit: z.coerce.number().int().min(1).max(20).default(7),
});
export type BreakdownQuery = z.infer<typeof breakdownQuery>;

export type BreakdownSlice = {
	id: string | null;
	name: string;
	color: string | null;
	value: number;
	previousValue: number;
	share: number;
};
export type Breakdown = {
	by: BreakdownDimension;
	flow: MoneyFlow;
	total: number;
	previousTotal: number;
	items: BreakdownSlice[];
	others: number;
};

export type PeriodRange = { from: string; to: string; days: number };

export type Overview = {
	period: PeriodRange;
	previous: PeriodRange;
	balance: { start: number; end: number };
	income: number;
	expense: number;
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
	categoryId: string | null;
	name: string;
	color: string | null;
	expense: number;
	previousExpense: number;
	share: number;
};
export type CategoryBreakdown = {
	total: number;
	previousTotal: number;
	items: CategorySpending[];
	others: number;
};

export type ComparisonPoint = {
	day: number;
	date: string;
	current: number | null;
	previous: number;
	yearAgo: number;
};

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
	"pie-categories",
	"pie-accounts",
	"pie-cash-flow",
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
