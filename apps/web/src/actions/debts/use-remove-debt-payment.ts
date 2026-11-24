import type { Debt } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useRemoveDebtPayment = () =>
	useApiMutation(
		({ id, transactionId }: { id: string; transactionId: string }) =>
			api<Debt>(`/debts/${id}/payments/${transactionId}`, {
				method: "DELETE",
			}),
		refreshMoney,
	);
