import { z } from "zod";

export const SEARCH_SCOPES = [
	"all",
	"accounts",
	"categories",
	"transactions",
] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];

export const searchQuery = z.object({
	q: z.string().trim().min(1).max(120),
	scope: z.enum(SEARCH_SCOPES).default("all"),
	limit: z.coerce.number().int().min(1).max(20).default(5),
});
export type SearchQuery = z.infer<typeof searchQuery>;

export type SearchHit = {
	id: string;
	title: string;
	subtitle: string;
	amount: number | null;
	color: string | null;
};

export type SearchResults = {
	accounts: SearchHit[];
	categories: SearchHit[];
	transactions: SearchHit[];
};
