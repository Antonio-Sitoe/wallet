import type { CreateMonthItemInput, MonthItem } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useAddMonthItem = () =>
	useApiMutation(
		({
			month,
			...body
		}: Partial<CreateMonthItemInput> &
			Pick<CreateMonthItemInput, "name" | "amount"> & { month: string }) =>
			api<MonthItem>(`/budgets/months/${month}/items`, {
				method: "POST",
				body,
			}),
		refreshMoney,
	);
