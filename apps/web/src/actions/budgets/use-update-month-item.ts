import type { MonthItem, UpdateMonthItemInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateMonthItem = () =>
	useApiMutation(
		({ id, ...body }: UpdateMonthItemInput & { id: string }) =>
			api<MonthItem>(`/budgets/month-items/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
