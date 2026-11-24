import { refreshMoney } from "@/actions/shared/refresh-money";
import { useApiMutation } from "@/actions/shared/use-api-mutation";
import { api } from "@/lib/api";

export const useIgnoreDebtSuggestion = () =>
	useApiMutation(
		(key: string) =>
			api<void>(`/debts/suggestions/${encodeURIComponent(key)}/ignore`, {
				method: "POST",
			}),
		refreshMoney,
	);
