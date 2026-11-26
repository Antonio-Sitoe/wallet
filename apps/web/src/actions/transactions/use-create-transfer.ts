import type { CreateTransferInput, Transfer } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { useLocalMutation } from "@/actions/shared/use-local-mutation";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineWrites } from "@/lib/offline/registry";
import type { CreateTransferBody } from "@/lib/offline/writes";

const useCreateTransferOnline = () =>
	useApiMutation(
		(
			body: Wire<Omit<CreateTransferInput, "referenceMonth">> & {
				referenceMonth?: string;
			},
		) => api<Transfer>("/transfers", { method: "POST", body }),
		refreshMoney,
	);

const createTransferLocally = (vars: CreateTransferBody) =>
	offlineWrites().createTransfer(vars);

const useCreateTransferDesktop = () => useLocalMutation(createTransferLocally);

export const useCreateTransfer =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useCreateTransferDesktop
		: useCreateTransferOnline;
