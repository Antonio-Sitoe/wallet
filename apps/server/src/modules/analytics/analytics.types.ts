export type AnalyticsDeps = {
	transactions: {
		dailyTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<{ day: string; income: number; expense: number }[]>;
		netBefore(userId: string, at: Date, accountId?: string): Promise<number>;
		dailyNet(
			userId: string,
			from: Date,
			to: Date,
			accountId?: string,
		): Promise<{ day: string; net: number }[]>;
		categoryTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<
			{ categoryId: string | null; income: number; expense: number }[]
		>;
		accountTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<{ accountId: string; income: number; expense: number }[]>;
	};
	accounts: {
		initialTotal(userId: string): Promise<number>;
		list(userId: string): Promise<
			{
				id: string;
				name: string;
				color: string | null;
				initialBalance: number;
			}[]
		>;
	};
	categories: {
		list(userId: string): Promise<
			{
				id: string;
				name: string;
				color: string | null;
				parentId: string | null;
			}[]
		>;
	};
};
