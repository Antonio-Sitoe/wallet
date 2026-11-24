import type { GoalDetail, UpdateGoalInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateGoal = () =>
	useApiMutation(
		({ id, ...body }: UpdateGoalInput & { id: string }) =>
			api<GoalDetail>(`/goals/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
