import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useDeletePlanItem = () =>
	useApiMutation(
		({ id, applyFrom }: { id: string; applyFrom?: string }) =>
			api<void>(`/budgets/plan-items/${id}`, {
				method: "DELETE",
				query: { applyFrom },
			}),
		refreshMoney,
	);
