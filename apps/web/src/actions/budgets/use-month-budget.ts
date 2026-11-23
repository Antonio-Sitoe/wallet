import { useQuery } from "@tanstack/react-query";
import type { MonthBudget } from "@wallet/shared";
import { api } from "@/lib/api";

export const useMonthBudget = (month: string) =>
	useQuery({
		queryKey: ["budget-month", month],
		queryFn: () => api<MonthBudget>(`/budgets/months/${month}`),
	});
