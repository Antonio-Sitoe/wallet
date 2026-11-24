import type { CreatePlanItemInput, PlanItem } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useAddPlanItem = () =>
	useApiMutation(
		({
			year,
			...body
		}: Partial<CreatePlanItemInput> &
			Pick<CreatePlanItemInput, "name" | "amount"> & { year: number }) =>
			api<PlanItem>(`/budgets/plans/${year}/items`, { method: "POST", body }),
		refreshMoney,
	);
