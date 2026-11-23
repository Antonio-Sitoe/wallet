import type { Account } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useReconcileAccount = () =>
	useApiMutation(
		({ id, balance }: { id: string; balance: number }) =>
			api<Account>(`/accounts/${id}/reconcile`, {
				method: "POST",
				body: { balance },
			}),
		refreshMoney,
	);
