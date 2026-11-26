import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { Transaction, Transfer } from "@wallet/shared";
import { useMemo } from "react";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineCollections } from "@/lib/offline/registry";
import { transferOf } from "@/lib/offline/transaction-window";

const useTransferOnline = (id: string | null, enabled = true) =>
	useQuery({
		queryKey: ["transfer", id],
		queryFn: () => api<Transfer>(`/transfers/${id}`),
		enabled: !!id && enabled,
	});

function useTransferDesktop(id: string | null) {
	const transactions = useLiveQuery((q) =>
		q.from({ transaction: offlineCollections().transactions }),
	);
	const local = useMemo(
		() =>
			id
				? transferOf(
						id,
						((transactions.data ?? []) as Transaction[]).filter(
							(tx) => tx.transferId === id,
						),
					)
				: null,
		[id, transactions.data],
	);
	const online = useTransferOnline(id, transactions.isReady && !local);
	return local ? { data: local } : online;
}

export const useTransfer =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useTransferDesktop
		: useTransferOnline;
