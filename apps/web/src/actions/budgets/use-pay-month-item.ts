import type { MonthItem, PayMonthItemInput } from "@wallet/shared";
import type { Wire } from "@/@types/wire";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const usePayMonthItem = () =>
	useApiMutation(
		({ id, ...body }: Wire<PayMonthItemInput> & { id: string }) =>
			api<MonthItem>(`/budgets/month-items/${id}/payments`, {
				method: "POST",
				body,
			}),
		refreshMoney,
	);
