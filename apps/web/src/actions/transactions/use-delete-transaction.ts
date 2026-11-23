import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteTransaction = () =>
	useApiMutation(
		(id: string) => api<void>(`/transactions/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
