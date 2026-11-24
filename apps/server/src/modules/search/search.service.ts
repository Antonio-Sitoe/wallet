import type {
	Account,
	Category,
	SearchHit,
	SearchQuery,
	SearchResults,
	TransactionPage,
} from "@wallet/shared";

export type SearchDeps = {
	accounts: { list(userId: string): Promise<Account[]> };
	categories: { list(userId: string): Promise<Category[]> };
	transactions: {
		search(userId: string, q: string, limit: number): Promise<TransactionPage>;
	};
};

const ACCOUNT_TYPE: Record<Account["type"], string> = {
	bank: "Banco",
	mobile_wallet: "Carteira móvel",
	cash: "Dinheiro",
	savings: "Poupança",
};

export const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();

const matches = (needle: string, ...haystack: (string | null | undefined)[]) =>
	normalize(haystack.filter(Boolean).join(" ")).includes(needle);

const dayOf = (iso: string) =>
	new Date(Date.parse(iso) + 2 * 3_600_000).toISOString().slice(0, 10);

export class SearchService {
	constructor(private readonly deps: SearchDeps) {}

	async search(userId: string, query: SearchQuery): Promise<SearchResults> {
		const { q, scope, limit } = query;
		const needle = normalize(q);
		const wants = (s: SearchQuery["scope"]) => scope === "all" || scope === s;
		const needsNames = wants("categories") || wants("transactions");
		const needsAccounts = wants("accounts") || wants("transactions");
		const [accounts, categories, page] = await Promise.all([
			needsAccounts ? this.deps.accounts.list(userId) : [],
			needsNames ? this.deps.categories.list(userId) : [],
			wants("transactions")
				? this.deps.transactions.search(userId, q, limit)
				: null,
		]);
		const accountName = new Map<string, string>(
			accounts.map((a) => [a.id, a.name]),
		);
		const category = new Map<string, Category>(
			categories.map((c) => [c.id, c]),
		);

		const accountHits: SearchHit[] = wants("accounts")
			? accounts
					.filter((a) => !a.archived && matches(needle, a.name))
					.slice(0, limit)
					.map((a) => ({
						id: a.id,
						title: a.name,
						subtitle: ACCOUNT_TYPE[a.type],
						amount: a.balance,
						color: a.color,
					}))
			: [];

		const categoryHits: SearchHit[] = wants("categories")
			? categories
					.filter((c) => !c.archived && !c.isSystem && matches(needle, c.name))
					.sort((a, b) => b.transactionCount - a.transactionCount)
					.slice(0, limit)
					.map((c) => {
						const parent = c.parentId ? category.get(c.parentId) : undefined;
						return {
							id: c.id,
							title: c.name,
							subtitle: [parent?.name, `${c.transactionCount} registos`]
								.filter(Boolean)
								.join(" · "),
							amount: null,
							color: c.color ?? parent?.color ?? null,
						};
					})
			: [];

		const transactionHits: SearchHit[] = (page?.items ?? []).map((t) => {
			const c = t.categoryId ? category.get(t.categoryId) : undefined;
			return {
				id: t.id,
				title: t.payee || t.note || c?.name || "Transacção",
				subtitle: [accountName.get(t.accountId), dayOf(t.occurredAt)]
					.filter(Boolean)
					.join(" · "),
				amount: t.amount,
				color: c?.color ?? null,
			};
		});

		return {
			accounts: accountHits,
			categories: categoryHits,
			transactions: transactionHits,
		};
	}
}
