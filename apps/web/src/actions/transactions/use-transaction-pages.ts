import { useInfiniteQuery } from "@tanstack/react-query";
import type { TransactionPage } from "@wallet/shared";
import type { TransactionFilters } from "@/@types/transaction-filters";
import { api } from "@/lib/api";

export const useTransactionPages = (filters: TransactionFilters, limit = 100) =>
	useInfiniteQuery({
		queryKey: ["transactions", filters, limit],
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam }) =>
			api<TransactionPage>("/transactions", {
				query: { ...filters, limit, cursor: pageParam },
			}),
		getNextPageParam: (last) => last.nextCursor ?? undefined,
	});
