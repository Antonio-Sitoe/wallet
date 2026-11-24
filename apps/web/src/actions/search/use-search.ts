import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { SearchResults, SearchScope } from "@wallet/shared";
import { api } from "@/lib/api";

export const useSearch = (q: string, scope: SearchScope = "all") =>
	useQuery({
		queryKey: ["search", q, scope],
		queryFn: () =>
			api<SearchResults>("/search", { query: { q, scope, limit: 5 } }),
		enabled: q.trim().length > 0,
		placeholderData: keepPreviousData,
		staleTime: 15_000,
	});
