import type { PlanItem, UpdatePlanItemInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdatePlanItem = () =>
	useApiMutation(
		({ id, ...body }: UpdatePlanItemInput & { id: string }) =>
			api<PlanItem>(`/budgets/plan-items/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
