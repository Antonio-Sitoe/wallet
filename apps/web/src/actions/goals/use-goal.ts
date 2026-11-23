import { useQuery } from "@tanstack/react-query";
import type { GoalDetail } from "@wallet/shared";
import { api } from "@/lib/api";

export const useGoal = (id: string | null) =>
	useQuery({
		queryKey: ["goal", id],
		queryFn: () => api<GoalDetail>(`/goals/${id}`),
		enabled: !!id,
	});
