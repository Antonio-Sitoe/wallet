import type { Plan } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreatePlan = () =>
	useApiMutation(
		(body: {
			year: number;
			expectedIncome?: number;
			copyFrom?: number;
			copyOneOff?: boolean;
			copySeasonal?: boolean;
		}) => api<Plan>("/budgets/plans", { method: "POST", body }),
		refreshMoney,
	);
