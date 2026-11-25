import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { useLocalMutation } from "@/actions/shared/use-local-mutation";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineWrites } from "@/lib/offline/registry";

const useDeleteTransferOnline = () =>
	useApiMutation(
		(id: string) => api<void>(`/transfers/${id}`, { method: "DELETE" }),
		refreshMoney,
	);

const deleteTransferLocally = (id: string) =>
	offlineWrites().deleteTransfer(id);

const useDeleteTransferDesktop = () => useLocalMutation(deleteTransferLocally);

export const useDeleteTransfer =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useDeleteTransferDesktop
		: useDeleteTransferOnline;
