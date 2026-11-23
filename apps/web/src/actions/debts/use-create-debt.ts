import type { CreateDebtInput, Debt } from "@wallet/shared";
import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useCreateDebt = () =>
	useApiMutation(
		(body: CreateDebtInput) => api<Debt>("/debts", { method: "POST", body }),
		refreshMoney,
	);
