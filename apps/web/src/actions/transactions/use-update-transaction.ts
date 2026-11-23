import type { Transaction, UpdateTransactionInput } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateTransaction = () =>
	useApiMutation(
		({ id, ...body }: Wire<UpdateTransactionInput> & { id: string }) =>
			api<Transaction>(`/transactions/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
