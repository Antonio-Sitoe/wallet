import { useQuery } from "@tanstack/react-query";
import type { Goal } from "@wallet/shared";
import { api } from "@/lib/api";

export const useGoals = (includeArchived = false) =>
	useQuery({
		queryKey: ["goals", { includeArchived }],
		queryFn: () => api<Goal[]>("/goals", { query: { includeArchived } }),
	});
