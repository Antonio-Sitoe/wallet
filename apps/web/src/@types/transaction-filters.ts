export type TransactionFilters = {
	from?: string;
	to?: string;
	accountId?: string[];
	categoryId?: string[];
	type?: "expense" | "income" | "transfer" | "adjustment";
	referenceMonth?: string;
	q?: string;
};
