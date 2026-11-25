import { useLiveQuery } from "@tanstack/react-db";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Category, Transaction, TransactionPage } from "@wallet/shared";
import { useCallback, useMemo, useState } from "react";
import type { TransactionFilters } from "@/@types/transaction-filters";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineCollections } from "@/lib/offline/registry";
import {
	filterTransactions,
	insideWindow,
} from "@/lib/offline/transaction-window";

const useTransactionPagesOnline = (
	filters: TransactionFilters,
	limit = 100,
	enabled = true,
) =>
	useInfiniteQuery({
		queryKey: ["transactions", filters, limit],
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam }) =>
			api<TransactionPage>("/transactions", {
				query: { ...filters, limit, cursor: pageParam },
			}),
		getNextPageParam: (last) => last.nextCursor ?? undefined,
		enabled,
	});

function useLocalTransactionPages(filters: TransactionFilters, limit: number) {
	const collections = offlineCollections();
	const transactions = useLiveQuery((q) =>
		q.from({ transaction: collections.transactions }),
	);
	const categories = useLiveQuery((q) =>
		q.from({ category: collections.categories }),
	);
	const loaded =
		(transactions.isReady || transactions.isLoadingError) &&
		(categories.isReady || categories.isLoadingError);
	const filtersKey = JSON.stringify(filters);
	const key = `${filtersKey}:${limit}`;
	const [pages, setPages] = useState({ key, count: 1 });
	const count = pages.key === key ? pages.count : 1;
	const matches = useMemo(
		() =>
			loaded
				? filterTransactions(
						transactions.data as Transaction[],
						JSON.parse(filtersKey) as TransactionFilters,
						categories.data as Category[],
					)
				: [],
		[loaded, transactions.data, categories.data, filtersKey],
	);
	const shown = count * limit;
	const fetchNextPage = useCallback(() => {
		setPages({ key, count: count + 1 });
		return Promise.resolve();
	}, [key, count]);
	return {
		data: loaded
			? {
					pages: [{ items: matches.slice(0, shown), nextCursor: null }],
					pageParams: [undefined],
				}
			: undefined,
		isPending: !loaded,
		error: null,
		hasNextPage: matches.length > shown,
		isFetchingNextPage: false,
		fetchNextPage,
	};
}

function useTransactionPagesDesktop(filters: TransactionFilters, limit = 100) {
	const local = useLocalTransactionPages(filters, limit);
	const inside = insideWindow(filters);
	const online = useTransactionPagesOnline(filters, limit, !inside);
	if (inside || online.isError) return local;
	return online;
}

export const useTransactionPages =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useTransactionPagesDesktop
		: useTransactionPagesOnline;
