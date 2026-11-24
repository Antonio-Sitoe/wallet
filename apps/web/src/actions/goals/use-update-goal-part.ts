import type { GoalDetail, UpdateGoalPartInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateGoalPart = () =>
	useApiMutation(
		({ id, ...body }: UpdateGoalPartInput & { id: string }) =>
			api<GoalDetail>(`/goal-parts/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
