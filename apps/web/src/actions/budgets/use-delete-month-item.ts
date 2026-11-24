import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteMonthItem = () =>
	useApiMutation(
		(id: string) =>
			api<void>(`/budgets/month-items/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
