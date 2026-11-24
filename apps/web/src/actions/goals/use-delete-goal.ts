import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteGoal = () =>
	useApiMutation(
		(id: string) => api<void>(`/goals/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
