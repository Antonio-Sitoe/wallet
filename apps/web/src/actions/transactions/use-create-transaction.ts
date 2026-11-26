import type { CreateTransactionInput, Transaction } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { useLocalMutation } from "@/actions/shared/use-local-mutation";
import { api } from "@/lib/api";
import { offlineEnabled } from "@/lib/offline/flag";
import { offlineWrites } from "@/lib/offline/registry";
import type { CreateTransactionBody } from "@/lib/offline/writes";

const useCreateTransactionOnline = () =>
	useApiMutation(
		(
			body: Wire<Partial<CreateTransactionInput>> &
				Pick<CreateTransactionInput, "type" | "accountId" | "amount">,
		) => api<Transaction>("/transactions", { method: "POST", body }),
		refreshMoney,
	);

const createTransactionLocally = (vars: CreateTransactionBody) =>
	offlineWrites().createTransaction(vars);

const useCreateTransactionDesktop = () => useLocalMutation(createTransactionLocally);

export const useCreateTransaction =
	import.meta.env.VITE_DESKTOP === "1" && offlineEnabled
		? useCreateTransactionDesktop
		: useCreateTransactionOnline;
