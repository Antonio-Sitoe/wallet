import type { CreateTransactionInput, Transaction } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreateTransaction = () =>
	useApiMutation(
		(
			body: Wire<Partial<CreateTransactionInput>> &
				Pick<CreateTransactionInput, "type" | "accountId" | "amount">,
		) => api<Transaction>("/transactions", { method: "POST", body }),
		refreshMoney,
	);
