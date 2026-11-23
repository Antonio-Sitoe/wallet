import type { CreateGoalPartInput, GoalDetail } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useAddGoalPart = () =>
	useApiMutation(
		({
			goalId,
			...body
		}: Partial<CreateGoalPartInput> &
			Pick<CreateGoalPartInput, "name" | "amount"> & { goalId: string }) =>
			api<GoalDetail>(`/goals/${goalId}/parts`, { method: "POST", body }),
		refreshMoney,
	);
