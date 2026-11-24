import type { Plan } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdatePlan = () =>
	useApiMutation(
		({ year, expectedIncome }: { year: number; expectedIncome: number }) =>
			api<Plan>(`/budgets/plans/${year}`, {
				method: "PATCH",
				body: { expectedIncome },
			}),
		refreshMoney,
	);
