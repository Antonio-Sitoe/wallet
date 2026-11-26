import type { Transaction, UpdateTransactionInput } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { useLocalMutation } from "@/actions/shared/use-local-mutation";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineWrites } from "@/lib/offline/registry";
import type { UpdateTransactionBody } from "@/lib/offline/writes";

const useUpdateTransactionOnline = () =>
	useApiMutation(
		({ id, ...body }: Wire<UpdateTransactionInput> & { id: string }) =>
			api<Transaction>(`/transactions/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);

const updateTransactionLocally = (vars: UpdateTransactionBody) =>
	offlineWrites().updateTransaction(vars);

const useUpdateTransactionDesktop = () => useLocalMutation(updateTransactionLocally);

export const useUpdateTransaction =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useUpdateTransactionDesktop
		: useUpdateTransactionOnline;
