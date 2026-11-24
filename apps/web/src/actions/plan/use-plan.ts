import { useQuery } from "@tanstack/react-query";
import type { Plan } from "@wallet/shared";
import { api } from "@/lib/api";

export const usePlan = (year: number) =>
	useQuery({
		queryKey: ["plan", year],
		queryFn: () => api<Plan>(`/budgets/plans/${year}`),
		retry: (count, error) =>
			(error as { status?: number }).status !== 404 && count < 2,
	});
