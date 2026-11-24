import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteDebt = () =>
	useApiMutation(
		(id: string) => api<void>(`/debts/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
