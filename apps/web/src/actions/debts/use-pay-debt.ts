import type { Debt, PayDebtInput } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const usePayDebt = () =>
	useApiMutation(
		({ id, ...body }: PayDebtInput & { id: string }) =>
			api<Debt>(`/debts/${id}/payments`, { method: "POST", body }),
		refreshMoney,
	);
