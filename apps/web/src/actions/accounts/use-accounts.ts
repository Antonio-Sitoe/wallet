import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "@wallet/shared";
import { useMemo, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineCollections, offlineWrites } from "@/lib/offline/registry";

const useAccountsOnline = (includeArchived = false) =>
	useQuery({
		queryKey: ["accounts", { includeArchived }],
		queryFn: () => api<Account[]>("/accounts", { query: { includeArchived } }),
	});

function useAccountsOffline(includeArchived = false) {
	const { data, isReady, isLoadingError } = useLiveQuery((q) =>
		q
			.from({ account: offlineCollections().accounts })
			.orderBy(({ account }) => account.serverOrder),
	);
	const loaded = isReady || isLoadingError;
	const writes = offlineWrites();
	const { deltas } = useSyncExternalStore(
		writes.subscribePending,
		writes.pendingState,
	);
	const visible = useMemo(
		() =>
			loaded
				? (data as Account[])
						.filter((a) => includeArchived || !a.archived)
						.map((a) =>
							deltas.has(a.id)
								? { ...a, balance: a.balance + (deltas.get(a.id) ?? 0) }
								: a,
						)
				: undefined,
		[data, loaded, includeArchived, deltas],
	);
	return { data: visible, isPending: !loaded, error: null };
}

export const useAccounts =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useAccountsOffline
		: useAccountsOnline;
