import type { Transfer, UpdateTransferInput } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { useLocalMutation } from "@/actions/shared/use-local-mutation";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineWrites } from "@/lib/offline/registry";
import type { UpdateTransferBody } from "@/lib/offline/writes";

const useUpdateTransferOnline = () =>
	useApiMutation(
		({ id, ...body }: Wire<UpdateTransferInput> & { id: string }) =>
			api<Transfer>(`/transfers/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

const updateTransferLocally = (vars: UpdateTransferBody) =>
	offlineWrites().updateTransfer(vars);

const useUpdateTransferDesktop = () => useLocalMutation(updateTransferLocally);

export const useUpdateTransfer =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useUpdateTransferDesktop
		: useUpdateTransferOnline;
