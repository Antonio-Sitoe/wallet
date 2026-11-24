import type { GoalDetail } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeleteGoalPart = () =>
	useApiMutation(
		(id: string) => api<GoalDetail>(`/goal-parts/${id}`, { method: "DELETE" }),
		refreshMoney,
	);
