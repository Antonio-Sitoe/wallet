import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { useLocalMutation } from "@/actions/shared/use-local-mutation";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineWrites } from "@/lib/offline/registry";

const useDeleteTransactionOnline = () =>
	useApiMutation(
		(id: string) => api<void>(`/transactions/${id}`, { method: "DELETE" }),
		refreshMoney,
	);

const deleteTransactionLocally = (id: string) =>
	offlineWrites().deleteTransaction(id);

const useDeleteTransactionDesktop = () => useLocalMutation(deleteTransactionLocally);

export const useDeleteTransaction =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useDeleteTransactionDesktop
		: useDeleteTransactionOnline;
