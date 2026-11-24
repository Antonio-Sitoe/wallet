import type { Plan } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useGeneratePlan = () =>
	useApiMutation(
		(year: number) =>
			api<{ created: number; plan: Plan }>(`/budgets/plans/${year}/generate`, {
				method: "POST",
			}),
		refreshMoney,
	);
