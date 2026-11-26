export type AnalyticsDeps = {
	transactions: {
		dailyTotals(
			userId: string,
			from: Date,
			to: Date,
		): Promise<{ day: string; income: number; expense: number }[]>;
		firstDay(userId: string): Promise<string | null>;
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
		payeeTotals(userId: string, from: Date, to: Date): Promise<NamedTotals[]>;
		labelTotals(userId: string, from: Date, to: Date): Promise<NamedTotals[]>;
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

export type NamedTotals = {
	key: string;
	name: string;
	income: number;
	expense: number;
};
