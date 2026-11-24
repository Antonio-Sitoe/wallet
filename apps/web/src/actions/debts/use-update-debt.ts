import type { Debt, UpdateDebtInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useUpdateDebt = () =>
	useApiMutation(
		({ id, ...body }: UpdateDebtInput & { id: string }) =>
			api<Debt>(`/debts/${id}`, { method: "PATCH", body }),
		refreshMoney,
	);
