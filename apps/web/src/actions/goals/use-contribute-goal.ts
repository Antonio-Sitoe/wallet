import type { ContributeGoalInput, GoalDetail } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useContributeGoal = () =>
	useApiMutation(
		({ id, ...body }: ContributeGoalInput & { id: string }) =>
			api<GoalDetail>(`/goals/${id}/contribute`, { method: "POST", body }),
		refreshMoney,
	);
