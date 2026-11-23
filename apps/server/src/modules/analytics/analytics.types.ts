export type AnalyticsDeps = {
	transactions: {
		dailyTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<{ day: string; income: number; expense: number }[]>;
		netBefore(userId: string, at: Date): Promise<number>;
		categoryTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<
			{ categoryId: string | null; income: number; expense: number }[]
		>;
	};
	accounts: { initialTotal(userId: string): Promise<number> };
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
