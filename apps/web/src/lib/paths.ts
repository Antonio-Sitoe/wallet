export const paths = {
	home: "/",
	login: "/login",
	start: "/start",
	dashboard: "/dashboard",
	transactions: "/transactions",
	accounts: "/accounts",
	budget: "/budget",
	stats: "/stats",
	debts: "/debts",
	goals: "/goals",
	payments: "/payments",
	plan: "/plan",
	import: "/import",
	shopping: "/shopping",
	categories: "/categories",
	assistant: "/assistant",
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];
