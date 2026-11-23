import type { CreateGoalInput, GoalDetail } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreateGoal = () =>
	useApiMutation(
		(
			body: Partial<CreateGoalInput> &
				Pick<CreateGoalInput, "name" | "target" | "accountId">,
		) => api<GoalDetail>("/goals", { method: "POST", body }),
		refreshMoney,
	);
