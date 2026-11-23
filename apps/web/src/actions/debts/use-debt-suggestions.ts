import { useQuery } from "@tanstack/react-query";
import type { DebtSuggestion } from "@wallet/shared";
import { api } from "@/lib/api";

export const useDebtSuggestions = () =>
	useQuery({
		queryKey: ["debt-suggestions"],
		queryFn: () => api<DebtSuggestion[]>("/debts/suggestions"),
	});
