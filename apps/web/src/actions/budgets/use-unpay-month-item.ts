import type { MonthItem } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUnpayMonthItem = () =>
	useApiMutation(
		(id: string) =>
			api<MonthItem>(`/budgets/month-items/${id}/payments`, {
				method: "DELETE",
			}),
		refreshMoney,
	);
